import AudioIcon from './AudioIcon';
import CodeIcon from './CodeIcon';
import ExcelIcon from './ExcelIcon';
import GenericFileIcon from './GenericFileIcon';
import PDFIcon from './PDFIcon';
import PictureIcon from './PictureIcon';
import PowerPointIcon from './PowerPointIcon';
import TextIcon from './TextIcon';
import VideoIcon from './VideoIcon';
import WordIcon from './WordIcon';
import ZipIcon from './ZipIcon';

// El color viaja dentro del SVG vía tokens --file-*, no como clase del consumer:
// así un mismo icono se ve igual en cualquier vista sin repetir la paleta.
function getFileIcon(fileName = '') {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.pdf')) return { Icon: PDFIcon, label: 'PDF' };
  if (/\.(doc|docx)$/.test(lowerName)) return { Icon: WordIcon, label: 'Word' };
  if (/\.(xls|xlsx|csv)$/.test(lowerName)) return { Icon: ExcelIcon, label: 'Excel' };
  if (/\.(ppt|pptx)$/.test(lowerName)) return { Icon: PowerPointIcon, label: 'PowerPoint' };
  if (/\.(zip|rar|7z|tar|gz)$/.test(lowerName)) return { Icon: ZipIcon, label: 'ZIP' };
  if (/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/.test(lowerName)) return { Icon: PictureIcon, label: 'Imagen' };
  if (/\.(js|jsx|ts|tsx|py|java|c|cpp|cs|go|rs|rb|php|html|css|json|xml|yaml|yml|md|sh)$/.test(lowerName)) {
    return { Icon: CodeIcon, label: 'Código' };
  }
  if (/\.(txt|log)$/.test(lowerName)) return { Icon: TextIcon, label: 'Texto' };
  if (/\.(mp3|wav|ogg|m4a|flac)$/.test(lowerName)) return { Icon: AudioIcon, label: 'Audio' };
  if (/\.(mp4|avi|mkv|mov|webm)$/.test(lowerName)) return { Icon: VideoIcon, label: 'Video' };

  return { Icon: GenericFileIcon, label: 'Archivo' };
}

export {
  AudioIcon,
  CodeIcon,
  ExcelIcon,
  GenericFileIcon,
  PDFIcon,
  PictureIcon,
  PowerPointIcon,
  TextIcon,
  VideoIcon,
  WordIcon,
  ZipIcon,
  getFileIcon,
};
