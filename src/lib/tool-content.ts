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
