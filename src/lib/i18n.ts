import type {Locale} from '@/config/site';
export type Dictionary={
 navTools:string;navWhy:string;navHow:string;navAbout:string;heroTag:string;heroTitle1:string;heroTitle2:string;heroSub:string;
 dropTitle:string;dropSub:string;browse:string;privacy:string;fast:string;free:string;popular:string;howTitle:string;
 howSteps:[string,string,string];featuresTitle:string;features:[string,string,string];footer:string;
 convert:string;processing:string;download:string;reset:string;error:string;multiple:string;selected:string;
 seoTools:string;related:string;toolDesc:(from:string,to:string)=>string;localNote:string;adsLabel:string;allTools:string;
 progress:string;quality:string;imageQuality:string;fileTooBig:string;
};
const dictionaries:Record<Locale,Dictionary>={
 en:{
 navTools:'Tools',navWhy:'Why FileMagik',navHow:'How it works',navAbout:'About',heroTag:'YOUR FILES. YOUR RULES.',
 heroTitle1:'Every file.',heroTitle2:'One magical place.',heroSub:'Convert, organize and transform documents, images and data in seconds. No unnecessary uploads. No complicated software.',
 dropTitle:'Drop your files here',dropSub:'Or select a file to get started',browse:'Choose files',privacy:'Private by design',fast:'Fast and simple',free:'100% free',
 popular:'Popular conversions',howTitle:'Three steps. That is all.',howSteps:['Choose a tool','Drop your files','Download the result'],
 featuresTitle:'Made for real work',features:['Files processed in your browser where possible','Clean results, no surprise watermarks','Four languages. One simple experience'],
 footer:'Made with care by Desarrollo By Jota!',convert:'Convert now',processing:'Processing…',download:'Download',reset:'New conversion',error:'Could not process your file.',
 multiple:'Select multiple PDFs to merge',selected:'Selected files',seoTools:'All conversion tools',related:'Other useful tools',
 toolDesc:(a,b)=>`Convert ${a} to ${b} online. Free, fast, and designed for privacy.`,localNote:'These files are processed locally in your browser.',
 adsLabel:'Advertisement',allTools:'Explore tools',progress:'Working on your file',quality:'Quality',imageQuality:'Image quality',fileTooBig:'File too large (maximum 25 MB per file).'
 },
 es:{
 navTools:'Herramientas',navWhy:'Por qué FileMagik',navHow:'Cómo funciona',navAbout:'Acerca de',heroTag:'TUS ARCHIVOS. TUS REGLAS.',
 heroTitle1:'Cualquier archivo.',heroTitle2:'Un lugar mágico.',heroSub:'Convierte, organiza y transforma documentos, imágenes y datos en segundos. Sin subidas innecesarias ni programas complicados.',
 dropTitle:'Arrastra tus archivos aquí',dropSub:'O selecciona un archivo para empezar',browse:'Elegir archivos',privacy:'Privacidad primero',fast:'Rápido y sencillo',free:'100 % gratis',
 popular:'Conversiones populares',howTitle:'Tres pasos. Nada más.',howSteps:['Elige una herramienta','Arrastra los archivos','Descarga el resultado'],
 featuresTitle:'Diseñado para el trabajo real',features:['Archivos procesados en tu navegador siempre que sea posible','Resultados limpios y sin marcas de agua sorpresa','Cuatro idiomas. Una experiencia sencilla'],
 footer:'Desarrollado por Desarrollo By Jota!',convert:'Convertir ahora',processing:'Procesando…',download:'Descargar',reset:'Nueva conversión',error:'No se pudo procesar el archivo.',
 multiple:'Selecciona varios PDF para unir',selected:'Archivos seleccionados',seoTools:'Todas las herramientas',related:'Otras herramientas útiles',
 toolDesc:(a,b)=>`Convierte ${a} a ${b} online, gratis, rápido y con privacidad.`,localNote:'Estos archivos se procesan localmente en tu navegador.',
 adsLabel:'Publicidad',allTools:'Ver herramientas',progress:'Procesando tu archivo',quality:'Calidad',imageQuality:'Calidad de imagen',fileTooBig:'Archivo demasiado grande (máximo 25 MB por archivo).'
 },
 pt:{
 navTools:'Ferramentas',navWhy:'Por que FileMagik',navHow:'Como funciona',navAbout:'Sobre',heroTag:'SEUS ARQUIVOS. SUAS REGRAS.',
 heroTitle1:'Qualquer arquivo.',heroTitle2:'Um lugar mágico.',heroSub:'Converta, organize e transforme documentos, imagens e dados em segundos. Sem uploads desnecessários ou programas complicados.',
 dropTitle:'Arraste seus arquivos aqui',dropSub:'Ou selecione um arquivo para começar',browse:'Selecionar arquivos',privacy:'Privacidade em primeiro lugar',fast:'Rápido e simples',free:'100% grátis',
 popular:'Conversões populares',howTitle:'Três passos. Só isso.',howSteps:['Escolha uma ferramenta','Arraste seus arquivos','Baixe o resultado'],
 featuresTitle:'Feito para o trabalho real',features:['Arquivos processados no navegador sempre que possível','Resultados limpos, sem marcas d’água surpresa','Quatro idiomas. Uma experiência simples'],
 footer:'Desenvolvido por Desarrollo By Jota!',convert:'Converter agora',processing:'Processando…',download:'Baixar',reset:'Nova conversão',error:'Não foi possível processar o arquivo.',
 multiple:'Selecione vários PDFs para juntar',selected:'Arquivos selecionados',seoTools:'Todas as ferramentas',related:'Outras ferramentas úteis',
 toolDesc:(a,b)=>`Converta ${a} para ${b} online, grátis, rápido e com privacidade.`,localNote:'Esses arquivos são processados localmente no navegador.',
 adsLabel:'Publicidade',allTools:'Ver ferramentas',progress:'Processando seu arquivo',quality:'Qualidade',imageQuality:'Qualidade da imagem',fileTooBig:'Arquivo muito grande (máximo de 25 MB por arquivo).'
 },
 fr:{
 navTools:'Outils',navWhy:'Pourquoi FileMagik',navHow:'Comment ça marche',navAbout:'À propos',heroTag:'VOS FICHIERS. VOS RÈGLES.',
 heroTitle1:'Tous vos fichiers.',heroTitle2:'Un seul endroit magique.',heroSub:'Convertissez, organisez et transformez documents, images et données en quelques secondes. Sans transferts inutiles ni logiciel compliqué.',
 dropTitle:'Déposez vos fichiers ici',dropSub:'Ou sélectionnez un fichier pour commencer',browse:'Choisir des fichiers',privacy:'Confidentialité',fast:'Rapide et simple',free:'100 % gratuit',
 popular:'Conversions populaires',howTitle:'Trois étapes. C’est tout.',howSteps:['Choisissez un outil','Déposez les fichiers','Téléchargez le résultat'],
 featuresTitle:'Pensé pour le travail réel',features:['Fichiers traités dans le navigateur lorsque c’est possible','Des résultats propres, sans filigrane surprise','Quatre langues. Une expérience simple'],
 footer:'Développé par Desarrollo By Jota!',convert:'Convertir',processing:'Traitement…',download:'Télécharger',reset:'Nouvelle conversion',error:'Impossible de traiter votre fichier.',
 multiple:'Sélectionnez plusieurs PDF à fusionner',selected:'Fichiers sélectionnés',seoTools:'Tous les outils',related:'Autres outils utiles',
 toolDesc:(a,b)=>`Convertissez ${a} en ${b} en ligne, gratuitement, rapidement et en toute confidentialité.`,localNote:'Ces fichiers sont traités localement dans votre navigateur.',
 adsLabel:'Publicité',allTools:'Voir les outils',progress:'Traitement du fichier',quality:'Qualité',imageQuality:'Qualité de l’image',fileTooBig:'Fichier trop volumineux (25 Mo maximum par fichier).'
 }
};
export const getDictionary=(locale:Locale)=>dictionaries[locale];