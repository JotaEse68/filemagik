"""Strict, embedded subset TrueType PDF font encoding for native text edits.

Only one-byte CMaps with explicit bfchar mappings and a physically embedded
FontFile2 are accepted. Missing glyphs, CID fonts, RTL/shaping, non-BMP,
ligatures, uncertain metrics and malformed maps are rejected safely.
"""
import re
import unicodedata
from fastapi import HTTPException

_SIMPLE_MAPPING=re.compile(rb"^<([0-9a-fA-F]{2})>\s+<([0-9a-fA-F]{4,8})>$")
_CHAR_SECTION=re.compile(rb"\d+\s+beginbfchar\s*(.*?)\s*endbfchar",re.S)

def _simple_cmap(font):
    if str(font.get("/Subtype"))!="/TrueType" or "/ToUnicode" not in font:
        return None
    descriptor=font.get("/FontDescriptor")
    if not descriptor:
        return None
    descriptor=descriptor.get_object()
    if "/FontFile2" not in descriptor:
        return None
    first=font.get("/FirstChar")
    widths=font.get("/Widths")
    if first is None or not widths or len(widths)>256:
        return None
    try:
        start=int(first)
        width_values=[float(w) for w in widths]
        cmap=font["/ToUnicode"].get_object().get_data()
        if not 0<=start<=255 or len(cmap)>65536 or b"beginbfrange" in cmap:
            return None
        if not re.search(rb"1\s+begincodespacerange\s*<00>\s*<FF>\s*endcodespacerange",cmap):
            # ReportLab subset fonts often declare <00> <7F>.
            if not re.search(rb"1\s+begincodespacerange\s*<00>\s*<7F>\s*endcodespacerange",cmap):
                return None
    except (ValueError,TypeError,AttributeError):
        return None
    mapping={}
    sections=_CHAR_SECTION.findall(cmap)
    if not sections:
        return None
    for section in sections:
        for raw_line in section.splitlines():
            raw_line=raw_line.strip()
            if not raw_line:
                continue
            found=_SIMPLE_MAPPING.fullmatch(raw_line)
            if not found:
                return None
            code=int(found.group(1),16)
            try:
                glyph=bytes.fromhex(found.group(2).decode("ascii")).decode("utf-16-be")
            except (ValueError,UnicodeDecodeError):
                return None
            if len(glyph)!=1 or glyph=="\x00" or unicodedata.category(glyph)[0] in ("C","M"):
                continue
            if code in mapping and mapping[code]!=glyph:
                return None
            mapping[code]=glyph
    if not mapping:
        return None
    return mapping,start,width_values

def encode_embedded_run(font,operand,original,replacement):
    """Return bytes for an embedded-font replacement or None for no match.

    The caller must still verify PDF page extraction and unchanged non-target
    text before returning the finished document.
    """
    parsed=_simple_cmap(font)
    if parsed is None:
        return None
    mapping,first,widths=parsed
    try:
        original_bytes=operand.original_bytes
        decoded="".join(mapping[code] for code in original_bytes)
    except (AttributeError,KeyError,TypeError):
        return None
    if decoded!=original:
        return None
    inverse={}
    for code,char in mapping.items():
        inverse.setdefault(char,[]).append(code)
    if any(unicodedata.bidirectional(char) in ("R","AL","RLE","RLO","AN","RLI","FSI","PDI")
           or unicodedata.category(char)[0] in ("M","C") for char in replacement):
        raise HTTPException(422,"Complex script shaping cannot be safely edited as single glyphs")
    if any(char not in inverse or len(inverse[char])!=1 for char in replacement):
        raise HTTPException(422,"Requested glyph is not present in the embedded font subset")
    encoded=bytes(inverse[c][0] for c in replacement)
    def width(values):
        total=0.0
        for code in values:
            index=code-first
            if index<0 or index>=len(widths) or not 0<float(widths[index])<5000:
                raise HTTPException(422,"Embedded glyph width is missing or invalid")
            total+=widths[index]
        return total
    if width(encoded)>width(original_bytes)+0.01:
        raise HTTPException(422,"Replacement exceeds the native text run width")
    return encoded
