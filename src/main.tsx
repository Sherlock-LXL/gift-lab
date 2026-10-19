import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

class ErrorBoundary extends React.Component<React.PropsWithChildren, {failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render() {
    return this.state.failed ? <main className="fatal"><h1>小猫打了个盹 🐈</h1><p>页面暂时没能打开。已保存的进度还在本机。</p><button className="primary" onClick={()=>location.reload()}>重新打开</button></main> : this.props.children;
  }
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><App /></ErrorBoundary></React.StrictMode>);
