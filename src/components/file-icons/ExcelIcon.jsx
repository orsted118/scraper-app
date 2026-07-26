import FileSheet, { KNOCKOUT } from './FileSheet';

function ExcelIcon(props) {
  return (
    <FileSheet color="var(--file-excel)" {...props}>
      <path
        d="M8.2 11.4l7.6 7.2M15.8 11.4l-7.6 7.2"
        stroke={KNOCKOUT}
        strokeWidth="1.6"
        strokeLinecap="square"
        fill="none"
      />
    </FileSheet>
  );
}

export default ExcelIcon;
