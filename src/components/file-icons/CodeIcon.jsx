import FileSheet, { KNOCKOUT } from './FileSheet';

function CodeIcon(props) {
  return (
    <FileSheet color="var(--file-code)" {...props}>
      <path
        d="M10.2 11.8L7.4 15l2.8 3.2M13.8 11.8L16.6 15l-2.8 3.2"
        stroke={KNOCKOUT}
        strokeWidth="1.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
    </FileSheet>
  );
}

export default CodeIcon;
