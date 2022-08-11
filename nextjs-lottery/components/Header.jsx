import { ConnectButton } from "web3uikit";
import styles from "../styles/Home.module.css";

export default function Header() {
  return (
    <div className={styles.header}>
      <div className={styles.title}>Decentralized Lottery</div>
      <ConnectButton moralisAuth={false} />
    </div>
  );
}
