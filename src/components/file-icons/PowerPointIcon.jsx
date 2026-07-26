import FileSheet, { KNOCKOUT } from './FileSheet';

function PowerPointIcon(props) {
  return (
    <FileSheet color="var(--file-ppt)" {...props}>
      <path
        d="M9.2 18.8v-7.6h3.4a2.3 2.3 0 010 4.6H9.2"
        stroke={KNOCKOUT}
        strokeWidth="1.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
    </FileSheet>
  );
}

export default PowerPointIcon;
