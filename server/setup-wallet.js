const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function setupWallet() {
  try {
    if (!process.env.ORACLE_WALLET_BASE64) {
      console.log('No ORACLE_WALLET_BASE64 environment variable found. Skipping wallet extraction.');
      return;
    }

    console.log('Setting up Oracle wallet from base64 encoded data...');

    const walletDir = path.join(__dirname, 'wallet');

    if (!fs.existsSync(walletDir)) {
      fs.mkdirSync(walletDir, { recursive: true });
      console.log(`Created wallet directory: ${walletDir}`);
    }

    const walletTarGz = Buffer.from(process.env.ORACLE_WALLET_BASE64, 'base64');
    const tarPath = path.join(__dirname, 'wallet.tar.gz');

    fs.writeFileSync(tarPath, walletTarGz);
    console.log('Wallet archive written to disk');

    execSync(`cd ${__dirname} && tar -xzf wallet.tar.gz -C wallet`, { stdio: 'inherit' });
    console.log('Wallet extracted successfully');

    fs.unlinkSync(tarPath);
    console.log('Temporary archive file removed');

    const walletFiles = fs.readdirSync(walletDir);
    console.log(`Wallet files extracted: ${walletFiles.join(', ')}`);

    return walletDir;
  } catch (error) {
    console.error('Error setting up wallet:', error);
    throw error;
  }
}

module.exports = { setupWallet };

if (require.main === module) {
  setupWallet()
    .then(() => {
      console.log('Wallet setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Wallet setup failed:', error);
      process.exit(1);
    });
}
