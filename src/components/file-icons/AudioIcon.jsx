import FileSheet, { KNOCKOUT } from './FileSheet';

function AudioIcon(props) {
  return (
    <FileSheet color="var(--file-audio)" {...props}>
      <path
        d="M8 14v2M10 12v6M12 10.4v9.2M14 12.6v4.8M16 14v2"
        stroke={KNOCKOUT}
        strokeWidth="1.4"
        strokeLinecap="square"
        fill="none"
      />
    </FileSheet>
  );
}

export default AudioIcon;
