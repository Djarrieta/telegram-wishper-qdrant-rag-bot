declare module 'pdf-text-extract' {
    function pdfTextExtract(path: string, callback: (err: any, pages: string[]) => void): void;
    export = pdfTextExtract;
}