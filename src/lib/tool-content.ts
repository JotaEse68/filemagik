import type {Locale,ToolSlug} from '@/config/site';
const summaries:Record<ToolSlug,[string,string,string,string]>={
 "server-heic-to-png":["Convert HEIC/HEIF to PNG with the secure private server (3 MB max).","Convierte HEIC/HEIF a PNG con el servidor privado protegido (máximo 3 MB).","Converta HEIC/HEIF para PNG no servidor privado protegido, com limite de 3 MB.","Convertissez HEIC/HEIF en PNG avec le serveur privé sécurisé, limité à 3 Mo."],
 "server-gif-to-webp":["Convert an animated GIF to animated WebP while retaining frames and timing.","Convierte GIF animado a WebP animado conservando fotogramas y duración.","Converta GIF animado em WebP animado preservando quadros e duração.","Convertissez un GIF animé en WebP animé tout en préservant les images et leur durée."],
 "server-video-extract-mp3":["Extract audio from a video with a sound track and export it as MP3.","Extrae el audio de un vídeo que tenga pista de sonido y descárgalo en MP3.","Extraia áudio de um vídeo que tenha faixa de som e exporte em MP3.","Extrayez le son d’une vidéo contenant une piste audio au format MP3."],
 "server-audio-to-wav":["Transcode audio to editable PCM WAV. This uncompressed format usually takes more space.","Convierte audio a WAV PCM para editarlo. Este formato sin comprimir suele ocupar más espacio.","Converta áudio para WAV PCM para edição. Este formato costuma ocupar mais espaço.","Convertissez l’audio en WAV PCM pour le montage. Le fichier est généralement plus volumineux."],
 "server-audio-to-mp3":["Transcode audio to MP3 using FFmpeg, with private-server quotas.","Convierte audio a MP3 con FFmpeg y cuotas del servidor privado.","Converta áudio para MP3 com FFmpeg e cotas aplicadas no servidor privado.","Convertissez l’audio en MP3 avec FFmpeg et des quotas du serveur privé."],
 "server-video-to-gif":["Convert short video clips to animated GIF through the private FFmpeg worker.","Convierte vídeos cortos a GIF animado mediante FFmpeg privado.","Converta vídeos curtos em GIF animado usando o serviço FFmpeg privado.","Convertissez des vidéos courtes en GIF animé avec le service FFmpeg privé."],
 "server-video-to-mp4":["Convert short videos to MP4 using a private FFmpeg worker.","Convierte vídeos cortos a MP4 con FFmpeg privado.","Converta vídeos curtos para MP4 usando o serviço FFmpeg privado.","Convertissez les courtes vidéos en MP4 avec le service FFmpeg privé."],
 "server-gif-to-mp4":["Convert the complete GIF animation to playable MP4, preserving multiple frames.","Convierte la animación GIF completa en MP4 reproducible, conservando fotogramas.","Converta toda a animação GIF em MP4, preservando os múltiplos quadros.","Convertissez l’animation GIF complète en MP4, sans perdre les images successives."],
 "server-extract-7z":["Safely extract regular 7Z files to ZIP, with server-side quota and size limits.","Extrae archivos 7Z normales a ZIP con cuotas y límites seguros.","Extraia arquivos 7Z regulares para ZIP com cotas e limites de tamanho.","Extrayez les archives 7Z ordinaires en ZIP avec quotas et limites de taille."],
 "server-join-audio":["Join two to four short compatible audio clips, max 120 seconds combined.","Une de dos a cuatro audios cortos compatibles, máximo 120 segundos en total.","Junte dois a quatro áudios, 120 segundos no total.","Assemblez deux à quatre audios courts, 120 secondes au total."],
 "server-join-video":["Join two to four video clips with audio into a single MP4, maximum 120 seconds.","Une de dos a cuatro vídeos con audio en un MP4 de hasta 120 segundos.","Junte de dois a quatro vídeos com áudio num MP4 até 120 segundos.","Assemblez deux à quatre vidéos avec son dans un MP4, 120 secondes maximum."],
 "server-audio-to-flac":["Convert supported audio files to lossless FLAC within secure server limits.","Convierte audio compatible a FLAC sin pérdida adicional, con límites de seguridad.","Converta áudio compatível para FLAC sem perdas adicionais.","Convertissez l’audio compatible en FLAC sans perte supplémentaire."],
 "server-audio-to-ogg":["Convert supported audio to compressed OGG Vorbis.","Convierte audio compatible a OGG Vorbis comprimido.","Converta áudio compatível para OGG Vorbis comprimido.","Convertissez l’audio compatible en OGG Vorbis."],
 "server-trim-audio":["Choose start and end seconds for a single MP3 excerpt.","Elige el inicio y final en segundos para recortar audio MP3.","Escolha início e fim em segundos para recortar áudio MP3.","Définissez les secondes de début et de fin pour recadrer l’audio MP3."],
 "server-trim-video":["Choose a time window and produce a re-encoded MP4 segment.","Selecciona un intervalo y genera un fragmento MP4 recodificado.","Selecione um intervalo e crie um excerto MP4.","Choisissez une plage temporelle et créez un extrait MP4."],
 "server-video-frame":["Capture one PNG frame at an exact time point.","Captura un fotograma PNG en el momento elegido.","Capture um quadro PNG no momento escolhido.","Capturez une image PNG à l’instant choisi."],
 "server-gif-frames-zip":["Export up to 60 GIF frames to PNG ZIP with per-frame timings.","Extrae hasta 60 fotogramas GIF en PNG y sus duraciones en un ZIP.","Extraia até 60 quadros GIF em PNG e durações num ZIP.","Exportez jusqu’à 60 images GIF en PNG avec les durées dans un ZIP."],
 "server-mixed-batch":["Convert up to six mixed audio/video/HEIC/GIF files with safe presets; receive ZIP and a per-file manifest.","Convierte hasta seis archivos HEIC/GIF/audio/vídeo con presets; recibe ZIP y estado por archivo.","Converta até seis arquivos HEIC/GIF/áudio/vídeo com presets; receba ZIP e estado por arquivo.","Convertissez jusqu’à six fichiers HEIC/GIF/audio/vidéo avec préréglages et rapport par fichier."],
 "server-extract-rar":["Safely extract regular RAR files to ZIP, with server-side quota and size limits.","Extrae archivos RAR normales a ZIP con cuotas y límites seguros.","Extraia arquivos RAR regulares para ZIP com cotas e limites de tamanho.","Extrayez les archives RAR ordinaires en ZIP avec quotas et limites de taille."],
 "gif-frames-to-zip":["Extract every frame of an animated GIF as PNG files plus playback timings in JSON. Maximum 120 frames. Browser codec support is required.","Extrae todos los fotogramas GIF a PNG y sus tiempos de reproducción en JSON. Máximo 120. Requiere navegador compatible.","Extraia todos os quadros GIF para PNG com os tempos em JSON. Máximo de 120 quadros. Requer navegador compatível.","Extrayez toutes les images GIF en PNG avec leurs durées en JSON. 120 images maximum. Navigateur compatible nécessaire."],
 "tiff-pages-to-zip":["Export up to 30 TIFF pages as individual PNGs in a ZIP (uncompressed or PackBits baseline TIFF). Total 36 megapixels maximum.","Exporta hasta 30 páginas TIFF como PNG individuales en un ZIP (TIFF básico sin compresión o PackBits). Máximo 36 megapíxeles.","Exporte até 30 páginas TIFF como PNG individuais em ZIP (TIFF básico sem compressão ou PackBits). Máximo 36 megapixels.","Exportez jusqu’à 30 pages TIFF en PNG individuels dans un ZIP (TIFF de base non compressé ou PackBits). 36 mégapixels au maximum."],
 "ods-to-pdf":["Convert OpenDocument spreadsheets to PDF using the professional server engine when available. Files are uploaded securely for processing.","Convierte hojas ODS a PDF con el motor profesional cuando esté disponible. Los archivos se envían de forma segura para procesarlos.","Converta planilhas ODS em PDF com o motor profissional quando disponível. Os arquivos são enviados para processamento.","Convertissez les feuilles ODS en PDF avec le moteur professionnel lorsqu’il est disponible. Les fichiers sont envoyés pour traitement."],
 "odp-to-pdf":["Convert OpenDocument presentations to PDF using the professional server engine when available. Files are uploaded securely for processing.","Convierte presentaciones ODP a PDF con el motor profesional cuando esté disponible. Los archivos se envían de forma segura para procesarlos.","Converta apresentações ODP em PDF com o motor profissional quando disponível. Os arquivos são enviados para processamento.","Convertissez les présentations ODP en PDF avec le moteur professionnel lorsqu’il est disponible. Les fichiers sont envoyés pour traitement."],
 "heic-to-png":["Convert HEIC/HEIF to PNG where the browser supports the codec. Unsupported browsers show a clear error; image sequences are not preserved.","Convierte HEIC/HEIF a PNG si el navegador admite el códec. En navegadores incompatibles se informa del error; no conserva secuencias.","Converta HEIC/HEIF para PNG quando o navegador suporta o codec. Navegadores incompatíveis mostram erro; não preserva sequências.","Convertissez HEIC/HEIF en PNG si le navigateur accepte le codec. Sinon un message apparaît ; les séquences ne sont pas conservées."],
 "tiff-to-png":["Convert uncompressed 8-bit grayscale or RGB TIFF to PNG. Compressed, multi-page and exotic TIFFs are not supported.","Convierte TIFF sin compresión de 8 bits en gris o RGB a PNG. No admite TIFF comprimidos o multipágina.","Converta TIFF de 8 bits sem compressão em cinza ou RGB para PNG. TIFF comprimido e multipágina não suportados.","Convertissez des TIFF non compressés 8 bits gris ou RVB en PNG. TIFF compressés et multipages non pris en charge."],
 "gif-to-png":["Extract the first frame of a GIF to PNG. Animation is intentionally not preserved.","Extrae el primer fotograma de un GIF a PNG. No conserva la animación.","Extraia o primeiro quadro de um GIF para PNG. A animação não é preservada.","Extrayez la première image d’un GIF en PNG. L’animation n’est pas conservée."],
 "markdown-to-docx":["Convert Markdown headings, text, lists and code to editable Word DOCX. Advanced layout and raw HTML are not preserved.","Convierte Markdown a Word DOCX editable con títulos, párrafos, listas y código. No conserva HTML ni diseño avanzado.","Converta Markdown para Word DOCX editável com títulos, listas e código. HTML e layout avançado não são preservados.","Convertissez Markdown en document Word DOCX éditable avec titres, listes et code. Les mises en page avancées ne sont pas conservées."],
 "avif-to-png":["Convert a still AVIF image to PNG in compatible browsers. Animated AVIF is not preserved.","Convierte imágenes AVIF estáticas a PNG en navegadores compatibles. No conserva animaciones AVIF.","Converta imagens AVIF estáticas para PNG em navegadores compatíveis. Animações não são preservadas.","Convertissez les images AVIF fixes en PNG sur les navigateurs compatibles. Les animations ne sont pas conservées."],
 "rtf-to-text":["Extract readable plain text from RTF files, including Unicode. Images, objects and formatting are omitted.","Extrae texto legible de archivos RTF, incluidos caracteres Unicode. No conserva imágenes, objetos ni formato.","Extraia texto legível de RTF, incluindo Unicode. Imagens, objetos e formatação são omitidos.","Extrayez du texte lisible de RTF, y compris Unicode. Images, objets et mise en forme ne sont pas conservés."],
 "epub-to-text":["Extract readable text from an EPUB ebook in its specified reading order. Images, layout and DRM are not reproduced.","Extrae el texto de un EPUB respetando el orden de lectura. No conserva imágenes, diseño ni elimina DRM.","Extraia texto EPUB na ordem de leitura. Imagens, formatação e DRM não são reproduzidos.","Extrayez le texte EPUB dans son ordre de lecture. Les images, la mise en page et les DRM ne sont pas conservés."],
 "create-tar":["Create a standard uncompressed TAR from up to 100 files (120 MB total).","Crea un TAR estándar sin compresión con hasta 100 archivos (120 MB en total).","Crie um TAR padrão sem compressão com até 100 arquivos (120 MB no total).","Créez une archive TAR standard non compressée avec 100 fichiers maximum (120 Mo au total)."],
 "extract-tar":["Safely extract regular files from a standard TAR into a downloadable ZIP. Symbolic links and extended TAR entries are rejected.","Extrae archivos normales de TAR a un ZIP descargable. Se rechazan enlaces y formatos extendidos por seguridad.","Extraia arquivos TAR regulares para um ZIP. Links e extensões não suportadas são recusados por segurança.","Extrayez des fichiers TAR réguliers dans un ZIP. Les liens et extensions non prises en charge sont refusés."],
 "pptx-to-pdf-layout":["Convert PPTX text and embedded photos to PDF slides; charts, animations and SmartArt may differ.","Convierte texto e imágenes de PPTX a diapositivas PDF. Gráficos complejos y animaciones pueden variar.","Converte textos e imagens de PPTX para PDF. Animações e gráficos complexos podem variar.","Convertit textes et images PPTX en PDF. Les animations et graphiques complexes peuvent différer."],
 "word-to-layout-pdf": ["Export DOCX paragraphs, tables and supported images to PDF. Word's exact layout and complex headers may differ.", "Exporta párrafos, tablas e imágenes compatibles de DOCX a PDF. La paginación exacta puede variar.", "Converte parágrafos, tabelas e imagens de DOCX em PDF. A paginação pode variar.", "Exporte paragraphes, tableaux et images DOCX vers PDF. La pagination peut différer."],
 "xlsx-to-layout-pdf": ["Turn editable Excel sheets into PDF pages with text and cell grids; formulas use stored results. Complex charts are unsupported.", "Convierte hojas Excel a PDF con celdas y filas; utiliza resultados guardados de fórmulas, sin gráficos complejos.", "Converte planilhas Excel em PDF com células e linhas. Gráficos complexos não suportados.", "Convertit Excel en PDF avec cellules et lignes. Graphiques complexes non pris en charge."],
 "edit-pdf-visual": ["Drag and place text, highlight boxes and rectangles directly on your PDF; export editable-overlay PDF, not permanent redaction.", "Coloca texto, resaltados y rectángulos directamente sobre las páginas del PDF; no elimina permanentemente contenido.", "Adicione texto, destaques e retângulos nas páginas do PDF; não é uma remoção permanente do conteúdo.", "Placez du texte, des surlignages et des rectangles directement sur le PDF, sans suppression définitive du contenu."],
 "pdf-to-word-visual": ["Preserves PDF pages including photos and tables as page images in Word; the visual content is not editable text.", "Conserva imágenes, tablas y columnas visualmente en Word, convirtiendo cada página en imagen; el contenido no es texto editable.", "Mantém imagens e tabelas visualmente no Word; as páginas são imagens, sem texto editável.", "Préserve visuellement tableaux et images dans Word sous forme d'images de page, non éditables."],
 "ocr-pdf-professional":["Protected Spanish and English OCR for scanned PDFs. Up to 12 pages. The result is raster-backed and does not preserve editable PDF objects.","OCR protegido en español e inglés, hasta 12 páginas. Reconstruye las páginas y no conserva objetos PDF editables.","OCR seguro em espanhol e inglês, 12 páginas. Não mantém os objetos PDF editáveis.","OCR protégé en anglais et espagnol, 12 pages. Les objets PDF éditables ne sont pas conservés."],
 "ocr-pdf-searchable": ["Adds an invisible OCR text layer over scanned PDF pages; up to 30 pages including rotated scans.", "Añade una capa OCR seleccionable; hasta 30 páginas, también giradas.", "Adiciona camada OCR selecionável; até 30 páginas, incluindo giradas.", "Ajoute une couche OCR ; jusqu’à 30 pages, même pivotées."],
 "compress-pdf-lossless": ["Rewrites PDF object structure without rasterizing; no output if the source is already smaller.", "Reorganiza la estructura PDF sin rasterizar; no genera archivo si el original pesa menos.", "Reorganiza a estrutura PDF sem rasterizar; não exporta se não reduzir.", "Réorganise la structure PDF sans rastériser ; n’exporte que si plus petit."],
 "protect-pdf": ["Protect your PDF with an opening password. Existing encryption may not be supported.", "Protege el PDF con contraseña de apertura. Algunos cifrados existentes no son compatibles.", "Proteja o PDF com uma senha. Alguns formatos criptografados não são compatíveis.", "Protégez le PDF par mot de passe. Certains PDF chiffrés ne sont pas pris en charge."],
 "unlock-pdf": ["Unlock only PDFs you are authorized to access and whose password you know.", "Desbloquea documentos autorizados cuya contraseña conozcas.", "Desbloqueie somente documentos autorizados com a senha correta.", "Déverrouillez uniquement les documents autorisés avec le bon mot de passe."],
 "pdf-to-excel-text": ["Extract rows of text into an Excel workbook; complex table layout and merged cells are not preserved.", "Extrae filas de texto a Excel; las tablas complejas y celdas fusionadas no se reconstruyen fielmente.", "Extrai linhas de texto para Excel; tabelas complexas não são reconstruídas fielmente.", "Extrait des lignes de texte dans Excel ; les tableaux complexes ne sont pas fidèlement reconstruits."],

  "jpg-to-webp": [
    "Reduce JPG size for fast-loading websites.",
    "Reduce el peso de tus JPG para webs rápidas.",
    "Reduza o tamanho dos JPG para sites mais rápidos.",
    "Réduisez le poids des JPG pour des sites plus rapides."
  ],
  "jpg-to-png": [
    "Turn a JPG photo into PNG; lost detail and transparency cannot be recovered.",
    "Pasa una foto JPG a PNG; no recupera detalles ni transparencias.",
    "Transforme JPG em PNG; detalhes e transparência perdidos não são recuperados.",
    "Passez de JPG à PNG sans pouvoir restaurer les détails ni la transparence."
  ],
  "webp-to-jpg": [
    "Export a WebP image to JPG; transparent pixels become white.",
    "Exporta una imagen WebP a JPG; el fondo transparente será blanco.",
    "Exporte WebP em JPG; pixels transparentes tornam-se brancos.",
    "Exportez une image WebP en JPG ; les zones transparentes deviennent blanches."
  ],
  "png-to-jpg": [
    "Make a compatible JPG from PNG; transparent areas are white.",
    "Crea un JPG compatible desde PNG; las zonas transparentes serán blancas.",
    "Crie JPG a partir de PNG; áreas transparentes ficam brancas.",
    "Créez un JPG depuis PNG ; les zones transparentes deviennent blanches."
  ],
  "png-to-webp": [
    "Convert PNG to WebP with transparency for lighter web graphics.",
    "Convierte PNG a WebP conservando la transparencia para optimizar tu web.",
    "Converta PNG em WebP mantendo transparência para sites mais leves.",
    "Convertissez PNG en WebP en conservant la transparence pour le web."
  ],
  "webp-to-png": [
    "Convert WebP images to PNG for editors that need it.",
    "Convierte WebP en PNG para editores que requieren este formato.",
    "Converta imagens WebP em PNG para editores compatíveis.",
    "Convertissez WebP en PNG pour les logiciels compatibles."
  ],
  "images-to-pdf": [
    "Combine up to 30 JPG or PNG images as individual pages in one PDF.",
    "Une hasta 30 imágenes JPG o PNG en un solo PDF, una por página.",
    "Junte até 30 imagens JPG ou PNG em um PDF, uma por página.",
    "Regroupez jusqu’à 30 images JPG ou PNG dans un PDF, une par page."
  ],
  "rotate-pdf": [
    "Rotate all PDF pages 90° clockwise without altering their content.",
    "Gira todas las páginas PDF 90° a la derecha conservando su contenido.",
    "Gire todas as páginas PDF 90° no sentido horário sem alterar o conteúdo.",
    "Faites pivoter les pages d’un PDF de 90° vers la droite."
  ],
  "csv-to-json": [
    "Convert comma-separated CSV rows to structured JSON objects.",
    "Convierte filas CSV separadas por comas en objetos JSON estructurados.",
    "Transforme linhas CSV separadas por vírgulas em objetos JSON.",
    "Convertissez des lignes CSV en objets JSON structurés."
  ],
  "json-to-csv": [
    "Export a JSON array of objects as CSV for spreadsheet software.",
    "Exporta un array JSON de objetos a CSV para hojas de cálculo.",
    "Exporte uma lista JSON de objetos para CSV para planilhas.",
    "Exportez un tableau JSON d’objets en CSV pour vos tableurs."
  ],
  "word-to-text": [
    "Extract plain text from DOCX without preserving images or layout.",
    "Extrae texto plano de DOCX sin conservar imágenes ni maquetación.",
    "Extraia texto simples de DOCX sem manter imagens ou layout.",
    "Extrayez le texte brut d’un DOCX sans images ni mise en page."
  ],
  "merge-pdf": [
    "Combine PDF documents in your chosen order without changing originals.",
    "Combina documentos PDF en el orden elegido sin cambiar los originales.",
    "Junte documentos PDF na ordem escolhida sem alterar os originais.",
    "Fusionnez vos PDF dans l’ordre choisi sans modifier les originaux."
  ],
  "split-pdf": [
    "Separate PDF pages into individual files inside a ZIP.",
    "Separa las páginas PDF en archivos individuales dentro de un ZIP.",
    "Separe páginas PDF em arquivos individuais num ZIP.",
    "Séparez les pages PDF dans des fichiers individuels au sein d’un ZIP."
  ],
  "ocr-image": [
    "Extract editable text from a screenshot or photo using OCR in your browser.",
    "Extrae texto editable de una captura o fotografía con OCR local.",
    "Extraia texto editável de imagens usando OCR no navegador.",
    "Extrayez du texte modifiable d’une image grâce à l’OCR dans le navigateur."
  ],
  "ocr-pdf": [
    "Recognize text in scanned PDF pages and export TXT; PDF output is not searchable.",
    "Reconoce texto de PDF escaneados y expórtalo a TXT, sin crear PDF buscable.",
    "Reconheça texto em PDFs digitalizados e exporte para TXT.",
    "Reconnaissez le texte de PDF numérisés et exportez-le au format TXT."
  ],
  "image-cleanup": [
    "Remove small unwanted overlays from your own images or authorized screenshots.",
    "Limpia marcas pequeñas en imágenes propias o capturas autorizadas.",
    "Remova pequenas marcas de imagens e capturas autorizadas.",
    "Retouchez les petites marques sur vos images et captures autorisées."
  ],
  "pdf-to-png": [
    "Render PDF pages to PNG images and download a ZIP.",
    "Convierte páginas de PDF en imágenes PNG y descárgalas en ZIP.",
    "Converta páginas PDF em imagens PNG em um ZIP.",
    "Convertissez les pages PDF en images PNG dans un ZIP."
  ],
  "pdf-to-word-text": [
    "Extract editable text to DOCX; layout and images are not preserved.",
    "Extrae texto editable a DOCX; no conserva el diseño ni las imágenes.",
    "Extraia texto editável para DOCX, sem layout nem imagens.",
    "Extrayez le texte modifiable en DOCX sans conserver la mise en page."
  ],
  "word-to-basic-pdf": [
    "Convert DOCX plain text to a simple PDF; complex formatting is lost.",
    "Convierte el texto de Word a un PDF básico; pierde maquetaciones complejas.",
    "Converta texto DOCX em PDF simples, sem preservar layouts.",
    "Convertissez le texte Word en PDF simple, sans mise en page complexe."
  ],
  "reorder-pdf-pages": [
    "Rearrange PDF pages by selecting a new page order.",
    "Reordena páginas de PDF y guarda su nueva organización.",
    "Reorganize páginas PDF e salve a nova ordem.",
    "Réorganisez les pages de vos PDF et enregistrez le résultat."
  ],
  "split-pdf-by-count": [
    "Split a PDF every 2, 5 or N pages into a ZIP.",
    "Divide PDF en bloques de 2, 5 o N páginas dentro de un ZIP.",
    "Divida o PDF em grupos de 2, 5 ou N páginas.",
    "Découpez les PDF par lots de 2, 5 ou N pages."
  ],
  "extract-pdf-pages": [
    "Extract selected page ranges into a new PDF.",
    "Extrae páginas o rangos concretos en un PDF nuevo.",
    "Extraia páginas ou intervalos específicos para outro PDF.",
    "Extrayez des plages de pages vers un nouveau PDF."
  ],
  "delete-pdf-pages": [
    "Remove selected PDF pages while leaving the original unchanged.",
    "Elimina las páginas seleccionadas y conserva el archivo original.",
    "Remova páginas selecionadas mantendo o original.",
    "Supprimez les pages choisies sans altérer l’original."
  ],
  "watermark-pdf": [
    "Add translucent text watermarks to your PDF pages.",
    "Añade marcas de agua de texto transparentes a tus PDF.",
    "Adicione marcas d’água translúcidas a documentos PDF.",
    "Ajoutez des filigranes de texte translucides à vos PDF."
  ],
  "xlsx-to-csv": [
    "Export the first Excel worksheet to CSV in the browser.",
    "Exporta la primera hoja XLSX a CSV desde el navegador.",
    "Exporte a primeira planilha XLSX como CSV.",
    "Exportez la première feuille Excel en CSV."
  ],
  "csv-to-xlsx": [
    "Make an editable Excel workbook from CSV rows.",
    "Convierte CSV a un archivo XLSX editable.",
    "Converta CSV em um arquivo XLSX editável.",
    "Convertissez vos lignes CSV en classeur Excel modifiable."
  ],
  "sign-pdf-visual": [
    "Add a visible text signature to a PDF. This is not a cryptographic or certified digital signature.",
    "Añade una firma de texto visible a un PDF. No es una firma digital certificada.",
    "Adicione uma assinatura de texto visível. Não é assinatura digital certificada.",
    "Ajoutez une signature visible. Ce n’est pas une signature numérique certifiée."
  ],
  "compress-pdf-raster": [
    "Reduce PDF size by converting pages to compressed images. Text and links are lost.",
    "Reduce el tamaño de PDF convirtiendo páginas en imágenes. Pierde texto seleccionable y enlaces.",
    "Reduza PDFs convertendo páginas em imagens. O texto e links são perdidos.",
    "Réduisez un PDF en convertissant les pages en images, sans texte sélectionnable."
  ],
  "create-zip": [
    "Compress several files into a ZIP archive in your browser, without uploading them.",
    "Comprime varios archivos en un ZIP directamente en el navegador, sin subirlos.",
    "Compacte vários arquivos em ZIP no navegador, sem upload.",
    "Compressez plusieurs fichiers dans une archive ZIP sans transfert."
  ],
  "extract-zip": [
    "Extract safely from a ZIP and download the files in a new archive.",
    "Extrae archivos de un ZIP de forma segura y descárgalos juntos.",
    "Extraia arquivos ZIP de forma segura e faça download num novo pacote.",
    "Extrayez les fichiers d'une archive ZIP et récupérez-les en téléchargement."
  ],
  "inspect-file": [
    "Inspect file type, size, modification date and SHA-256 checksum locally.",
    "Consulta tipo, tamaño, fecha y huella SHA-256 de un archivo sin subirlo.",
    "Consulte tipo, tamanho, data e hash SHA-256 de um arquivo localmente.",
    "Consultez le type, la taille, la date et le SHA-256 d'un fichier localement."
  ],
  "rename-batch": [
    "Rename up to 100 files with a consistent prefix and download as ZIP.",
    "Renombra hasta 100 archivos con un prefijo y descárgalos juntos en ZIP.",
    "Renomeie até 100 arquivos com prefixo e baixe como ZIP.",
    "Renommez jusqu’à 100 fichiers avec un préfixe, puis téléchargez le ZIP."
  ],
  "resize-image": [
    "Resize an image to a custom pixel width and download PNG.",
    "Cambia el ancho de una imagen a los píxeles que elijas y descarga PNG.",
    "Redimensione a largura de uma imagem em pixels e baixe PNG.",
    "Redimensionnez une image à la largeur souhaitée en pixels, puis téléchargez PNG."
  ],
  "batch-images-to-webp": [
    "Convert up to 30 JPG, PNG or WebP pictures to WebP and download a ZIP, locally in your browser.",
    "Convierte hasta 30 imágenes JPG, PNG o WebP a WebP y descárgalas juntas en un ZIP, desde tu navegador.",
    "Converta até 30 imagens JPG, PNG ou WebP para WebP e baixe o ZIP no navegador.",
    "Convertissez jusqu’à 30 images JPG, PNG ou WebP en WebP et téléchargez le ZIP dans votre navigateur."
  ],
  "adjust-image": [
    "Crop borders, rotate, compress and export images to PNG, JPG or WebP without keeping EXIF metadata.",
    "Recorta bordes, gira, comprime y exporta imágenes a PNG, JPG o WebP, eliminando los metadatos EXIF.",
    "Recorte bordas, gire, compacte e exporte imagens PNG, JPG ou WebP sem metadados EXIF.",
    "Rognez les bords, pivotez, compressez et exportez des images PNG, JPG ou WebP sans métadonnées EXIF."
  ],
  "srt-to-vtt": [
    "Convert SRT subtitles into WebVTT with correctly formatted timestamps for web video.",
    "Convierte subtítulos SRT a WebVTT con tiempos adaptados al vídeo web.",
    "Converta legendas SRT em WebVTT com carimbos de tempo válidos para vídeo web.",
    "Convertissez des sous-titres SRT en WebVTT avec des horodatages valides pour la vidéo web."
  ],
  "vtt-to-srt": [
    "Convert WebVTT subtitles into SRT with numbered cues for common media players.",
    "Convierte subtítulos WebVTT a SRT con numeración para reproductores habituales.",
    "Converta legendas WebVTT em SRT numerado para reprodutores de vídeo.",
    "Convertissez des sous-titres WebVTT en SRT numéroté pour les lecteurs vidéo."
  ],
  "crop-pdf": [
    "Crop the visible margins of a PDF without rasterizing the pages; hidden content is not erased.",
    "Recorta los márgenes visibles del PDF sin rasterizar las páginas; el contenido oculto no se borra.",
    "Recorte as margens visíveis do PDF sem rasterização; o conteúdo oculto não é apagado.",
    "Rognez les marges visibles du PDF sans rasteriser les pages; le contenu masqué n’est pas supprimé."
  ],
  "annotate-pdf-text": [
    "Add a visible text note to the bottom of all PDF pages without converting them to images.",
    "Añade una anotación de texto visible al pie de todas las páginas PDF sin convertirlas en imágenes.",
    "Adicione uma nota de texto visível ao rodapé de todas as páginas do PDF sem as rasterizar.",
    "Ajoutez une note visible au bas de toutes les pages PDF sans les convertir en images."
  ],
  "audio-to-wav": [
    "Convert browser-supported audio to uncompressed WAV and optionally trim a segment; codec support varies.",
    "Convierte audio compatible con tu navegador a WAV sin comprimir y recorta un fragmento si lo necesitas.",
    "Converta áudio compatível com seu navegador para WAV sem compressão e recorte um trecho.",
    "Convertissez l’audio pris en charge par votre navigateur en WAV non compressé, avec découpe facultative."
  ],
  "create-gzip": [
    "Compress a file into GZIP directly in the browser, without uploading it to a server.",
    "Comprime un archivo en GZIP directamente en tu navegador, sin subirlo a servidores.",
    "Compacte um arquivo em GZIP diretamente no navegador sem enviar ao servidor.",
    "Compressez un fichier en GZIP directement dans votre navigateur, sans transfert."
  ],
  "extract-gzip": [
    "Decompress a GZIP file locally with strict output-size limits to protect your browser.",
    "Descomprime archivos GZIP localmente con límites de tamaño para proteger el navegador.",
    "Descompacte arquivos GZIP localmente com limites de tamanho para proteger o navegador.",
    "Décompressez un fichier GZIP localement avec une limite de taille pour protéger le navigateur."
  ],
  "inspect-pdf-form": [
    "Find interactive AcroForm fields in a PDF and download their names, types and values as JSON.",
    "Identifica campos de formulario PDF AcroForm y descarga sus nombres, tipos y valores en JSON.",
    "Identifique campos AcroForm no PDF e baixe nomes, tipos e valores em JSON.",
    "Identifiez les champs AcroForm d’un PDF et exportez leurs noms, types et valeurs en JSON."
  ],
  "fill-pdf-form": [
    "Fill text, checkbox, dropdown and choice fields in an interactive PDF using JSON values.",
    "Rellena campos de texto, casillas y opciones de formularios PDF interactivos mediante valores JSON.",
    "Preencha campos de texto, caixas e opções de PDFs interativos usando valores JSON.",
    "Remplissez les champs texte, cases et choix d’un PDF interactif à partir de valeurs JSON."
  ],
  "flatten-pdf-form": [
    "Make filled interactive PDF form fields permanent, when the document is not digitally signed.",
    "Fija los campos de un formulario PDF para que ya no puedan editarse; no es apto para documentos firmados digitalmente.",
    "Fixe os campos de um formulário PDF para impedir a edição; não use em documentos assinados digitalmente.",
    "Figez les champs d’un formulaire PDF pour empêcher leur modification ; non adapté aux PDF signés numériquement."
  ],
  "image-to-bmp": [
    "Convert JPG, PNG or WebP into a real uncompressed 24-bit Windows BMP. Transparency becomes white.",
    "Convierte JPG, PNG o WebP en un BMP real de 24 bits para Windows. La transparencia pasa a blanco.",
    "Converta JPG, PNG ou WebP em BMP real de 24 bits para Windows. A transparência fica branca.",
    "Convertissez JPG, PNG ou WebP en BMP Windows 24 bits non compressé. La transparence devient blanche."
  ]
};
const index:Record<Locale,number>={en:0,es:1,pt:2,fr:3};
const guidance:Record<Locale,{privacy:string;tip:string;question:string}>={
en:{privacy:'Files are processed locally in your browser and are not uploaded to FileMagik servers.',tip:'Use an updated browser and keep the tab open until the result is ready.',question:'Are my files uploaded?'},
es:{privacy:'Tus archivos se procesan localmente en el navegador y no se suben a los servidores de FileMagik.',tip:'Utiliza un navegador actualizado y deja la pestaña abierta hasta finalizar.',question:'¿Se suben mis archivos?'},
pt:{privacy:'Seus arquivos são processados no navegador e não são enviados aos servidores do FileMagik.',tip:'Use um navegador atualizado e mantenha a aba aberta até terminar.',question:'Meus arquivos são enviados?'},
fr:{privacy:'Vos fichiers sont traités dans le navigateur et ne sont pas envoyés aux serveurs de FileMagik.',tip:'Utilisez un navigateur récent et gardez l’onglet ouvert jusqu’à la fin.',question:'Mes fichiers sont-ils envoyés ?'}
};
export function getToolCopy(locale:Locale,slug:ToolSlug){const g=guidance[locale];return {summary:summaries[slug][index[locale]],benefit:g.privacy,tip:g.tip,question:g.question,answer:g.privacy};}
