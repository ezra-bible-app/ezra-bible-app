const minimumNodeVersion = [22, 22, 2];
const currentNodeVersion = process.versions.node.split('.').map(Number);
const isSupported = currentNodeVersion[0] > minimumNodeVersion[0] ||
  (currentNodeVersion[0] === minimumNodeVersion[0] && (
    currentNodeVersion[1] > minimumNodeVersion[1] ||
    (currentNodeVersion[1] === minimumNodeVersion[1] && currentNodeVersion[2] >= minimumNodeVersion[2])
  ));

if (!isSupported) {
  console.error(`WDIO requires Node.js >=${minimumNodeVersion.join('.')}; current version is ${process.version}.`);
  console.error('Run "nvm use" from the repository root, or install the version in .nvmrc.');
  process.exitCode = 1;
}