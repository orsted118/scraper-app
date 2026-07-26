import FileSheet from './FileSheet';

// Sin glifo: cuando no se reconoce el formato, la hoja doblada sola comunica
// "archivo" sin inventar un símbolo que no corresponde.
function GenericFileIcon(props) {
  return <FileSheet color="var(--file-generic)" {...props} />;
}

export default GenericFileIcon;
