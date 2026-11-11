import Link from 'next/link';
import type {Locale,ToolSlug} from '@/config/site';
import {tools,siteUrl} from '@/config/site';
import {categoryOf,categoryLabels} from '@/config/tool-navigation';
import {getConversionBenefit} from '@/lib/conversion-benefits';
import {getToolCopy} from '@/lib/tool-content';

const copy={
 en:{heading:'About this conversion',benefit:'What is the result useful for?',steps:'How to use this free tool',first:'Choose a compatible file from your device.',second:'Review the options and start the conversion. Some server conversions require a security check.',third:'Download the result and check that it meets your needs.',limits:'Important to know',limitsText:'Output fidelity, file size and compatibility depend on the source format and the selected operation. Files handled on our server have size and usage limits to protect the free service.',related:'Related free tools',all:'Browse all file tools'},
 es:{heading:'Sobre esta conversión',benefit:'¿Para qué sirve el resultado?',steps:'Cómo utilizar esta herramienta gratis',first:'Elige un archivo compatible de tu dispositivo.',second:'Revisa las opciones e inicia el proceso. Algunas conversiones en servidor requieren una comprobación de seguridad.',third:'Descarga el resultado y comprueba que se ajusta a lo que necesitas.',limits:'Antes de convertir',limitsText:'La fidelidad, el tamaño y la compatibilidad dependen del archivo original y de la operación. Las conversiones en servidor tienen límites de tamaño y uso para mantener el servicio gratuito.',related:'Herramientas gratis relacionadas',all:'Ver todas las herramientas'},
 pt:{heading:'Sobre esta conversão',benefit:'Para que serve o resultado?',steps:'Como usar esta ferramenta gratuita',first:'Selecione um arquivo compatível do seu dispositivo.',second:'Confira as opções e inicie a conversão. Algumas operações no servidor exigem uma verificação de segurança.',third:'Baixe o resultado e confira se atende às suas necessidades.',limits:'Antes de converter',limitsText:'A fidelidade, o tamanho e a compatibilidade dependem do arquivo original e da operação. As conversões no servidor têm limites de tamanho e utilização para manter o serviço gratuito.',related:'Ferramentas grátis relacionadas',all:'Ver todas as ferramentas'},
 fr:{heading:'À propos de cette conversion',benefit:'À quoi sert le résultat ?',steps:'Comment utiliser cet outil gratuit',first:'Choisissez un fichier compatible sur votre appareil.',second:'Vérifiez les options et démarrez la conversion. Certaines opérations sur serveur exigent une vérification de sécurité.',third:'Téléchargez le résultat et vérifiez qu’il répond à vos besoins.',limits:'À savoir avant de convertir',limitsText:'La fidélité, la taille et la compatibilité dépendent du fichier d’origine et de l’opération. Les conversions sur serveur ont des limites de taille et d’utilisation pour préserver la gratuité du service.',related:'Outils gratuits associés',all:'Voir tous les outils'}
} as const;

export default function ToolSeoGuide({locale,slug}:{locale:Locale;slug:ToolSlug}){
 const words=copy[locale];
 const tool=tools.find(t=>t.slug===slug);
 if(!tool)return null;
 const category=categoryOf(slug);
 const related=tools.filter(t=>t.slug!==slug&&categoryOf(t.slug)===category).slice(0,5);
 const description=getToolCopy(locale,slug).summary;
 return <section className="section fm-tool-guide" aria-labelledby="fm-tool-guide-title">
  <div className="container">
   <h2 id="fm-tool-guide-title">{words.heading}: {tool.from} → {tool.to}</h2>
   <p>{description}</p>
   <h3>{words.benefit}</h3>
   <p>{getConversionBenefit(slug,locale)}</p>
   <h3>{words.steps}</h3>
   <ol><li>{words.first}</li><li>{words.second}</li><li>{words.third}</li></ol>
   <h3>{words.limits}</h3>
   <p>{words.limitsText}</p>
   {related.length>0&&<nav aria-label={words.related}><h3>{words.related}</h3><ul>{related.map(r=><li key={r.slug}><Link href={`/${locale}/${r.slug}`}>{r.from} → {r.to}</Link></li>)}</ul></nav>}
   <p><Link href={`/${locale}/tools?category=${category}`}>{categoryLabels[locale][category]}</Link> · <Link href={`/${locale}/tools`}>{words.all}</Link></p>
  </div>
 </section>;
}
