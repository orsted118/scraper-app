import FileSheet, { KNOCKOUT } from './FileSheet';

// Nombre "Picture" y no "Image" para no chocar con el ImageIcon de lucide-react
// que ya se importa en varias vistas.
function PictureIcon(props) {
  return (
    <FileSheet color="var(--file-image)" {...props}>
      <circle cx="10" cy="12.6" r="1.2" fill={KNOCKOUT} />
      <path
        d="M7.6 18.4l3-3.4 2 2.2 1.8-2.2 2 3.4z"
        fill={KNOCKOUT}
      />
    </FileSheet>
  );
}

export default PictureIcon;
