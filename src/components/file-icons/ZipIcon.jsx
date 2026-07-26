import FileSheet, { KNOCKOUT } from './FileSheet';

function ZipIcon(props) {
  return (
    <FileSheet color="var(--file-zip)" {...props}>
      <path
        d="M10.4 10.6h3.2M10.4 13h3.2M10.4 15.4h3.2M10.4 17.8h3.2"
        stroke={KNOCKOUT}
        strokeWidth="1.4"
        strokeLinecap="square"
        fill="none"
      />
    </FileSheet>
  );
}

export default ZipIcon;
