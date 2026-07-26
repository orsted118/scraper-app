import FileSheet, { KNOCKOUT } from './FileSheet';

function PDFIcon(props) {
  return (
    <FileSheet color="var(--file-pdf)" {...props}>
      <path
        d="M8.4 18.8L12 11.2l3.6 7.6M9.8 16.2h4.4"
        stroke={KNOCKOUT}
        strokeWidth="1.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
    </FileSheet>
  );
}

export default PDFIcon;
