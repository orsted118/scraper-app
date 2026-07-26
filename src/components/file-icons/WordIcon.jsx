import FileSheet, { KNOCKOUT } from './FileSheet';

function WordIcon(props) {
  return (
    <FileSheet color="var(--file-word)" {...props}>
      <path
        d="M7.4 11.2l1.8 7 2.8-5 2.8 5 1.8-7"
        stroke={KNOCKOUT}
        strokeWidth="1.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
    </FileSheet>
  );
}

export default WordIcon;
