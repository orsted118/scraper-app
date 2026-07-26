import FileSheet, { KNOCKOUT } from './FileSheet';

function TextIcon(props) {
  return (
    <FileSheet color="var(--file-text)" {...props}>
      <path
        d="M8 11.6h8M8 14.4h8M8 17.2h5"
        stroke={KNOCKOUT}
        strokeWidth="1.4"
        strokeLinecap="square"
        fill="none"
      />
    </FileSheet>
  );
}

export default TextIcon;
