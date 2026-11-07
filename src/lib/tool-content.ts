import type {Locale,ToolSlug} from '@/config/site';
const summaries:Record<ToolSlug,[string,string,string,string]>={
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
