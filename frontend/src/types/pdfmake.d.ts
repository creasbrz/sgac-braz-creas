// frontend/src/types/pdfmake.d.ts

/* NOTA: Este arquivo é estritamente para tipagem do TypeScript.
  Ele silencia os erros de importação da biblioteca pdfmake.
  Não há estilos ou Tailwind para aplicar aqui.
*/

declare module 'pdfmake/build/pdfmake' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfMake: any;
  export = pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfFonts: any;
  export = pdfFonts;
}