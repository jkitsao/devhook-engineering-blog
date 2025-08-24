
// import { remark } from "remark";
// import html from "remark-html";
// import rehypePrism from "rehype-prism-plus";

// export async function markdownToHtml(markdown: string) {
//   const result = await remark()
//     .use(html)
//     .use(rehypePrism)
//     .process(markdown);

//   return result.toString();
// }
// import { remark } from "remark";
// import html from "remark-html";
// import rehypePrism from "rehype-prism-plus";
// import remarkRehype from "remark-rehype";

// export async function markdownToHtml(markdown: string) {
//   const result = await remark()
//     .use(remarkRehype)
//     .use(rehypePrism, { showLineNumbers: true }) // highlight code blocks
//     .use(html)
//     .process(markdown);

//   return result.toString();
// }

import { remark } from "remark";
import remarkRehype from "remark-rehype";
import rehypePrism from "rehype-prism-plus";
import rehypeStringify from "rehype-stringify";

export async function markdownToHtml(markdown: string) {
  const result = await remark()
    .use(remarkRehype) // convert markdown -> rehype AST
    .use(rehypePrism, { showLineNumbers: true }) // highlight code
    .use(rehypeStringify) // convert rehype AST -> HTML
    .process(markdown);

  return result.toString();
}
