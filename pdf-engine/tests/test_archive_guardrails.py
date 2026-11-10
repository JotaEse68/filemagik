"""Archive safety regressions for hostile filenames and duplicate paths."""
from contextlib import contextmanager
import pytest
from fastapi import HTTPException
import archive_worker

class FakeEntry:
    isfile=True
    isdir=False
    size=4
    def __init__(self,pathname):self.pathname=pathname
    def get_blocks(self):yield b"data"

def mocked_archive(monkeypatch,paths):
    @contextmanager
    def reader(_path):
        yield [FakeEntry(path) for path in paths]
    monkeypatch.setattr(archive_worker.libarchive,"file_reader",reader)

@pytest.mark.parametrize("dangerous",[
    "../private.txt", "/etc/passwd", "C:/Windows/system.ini",
    "dir/../private.txt", "dir//file.txt", "hidden/./file.txt",
    "evil\x00.txt",
])
def test_rejects_unsafe_member_path(monkeypatch,dangerous):
    mocked_archive(monkeypatch,[dangerous])
    with pytest.raises(HTTPException) as info:
        archive_worker.safe_extract(b"fake archive","test.7z")
    assert info.value.status_code==422

def test_rejects_case_insensitive_duplicate_path(monkeypatch):
    mocked_archive(monkeypatch,["folder/Example.txt","folder/example.TXT"])
    with pytest.raises(HTTPException) as info:
        archive_worker.safe_extract(b"fake archive","test.rar")
    assert info.value.status_code==422

def test_valid_distinct_entries_retained(monkeypatch):
    import io,zipfile
    mocked_archive(monkeypatch,["folder/a.txt","folder/b.txt"])
    result=archive_worker.safe_extract(b"fake archive","test.rar")
    with zipfile.ZipFile(io.BytesIO(result)) as unpacked:
        assert len(unpacked.namelist())==2
        assert all(unpacked.read(name)==b"data" for name in unpacked.namelist())
