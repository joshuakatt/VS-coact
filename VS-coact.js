// Import the necessary VSCode modules
const vscode = require('vscode');
const { Disposable, window } = vscode;

// Import the collaboration platform API (in this case, Firebase)
const firebase = require('firebase');

class CodeShareExtension {

    constructor() {
      firebase.initializeApp({
        // Your Firebase configuration
      });
  
      this.shareCodeCommand = vscode.commands.registerCommand('vscoact.shareCode', this.shareCode, this);
      this.joinCodeCommand = vscode.commands.registerCommand('vscoact.joinCode', this.joinCode, this);
      this.currentSession = null;
    }
  
    async shareCode() {
      const sessionName = await window.showInputBox({ prompt: 'Enter a name for your code sharing session' });
  
      if (sessionName) {
        const sessionRef = firebase.database().ref(`sessions/${sessionName}`);
  
        try {
          await sessionRef.set({ code: '', users: {} });
          this.currentSession = sessionRef;
          await vscode.window.showInformationMessage(`Session created: ${sessionName}`);
          await vscode.window.showInformationMessage('Invite collaborators by sharing the session name with them!');
        } catch (err) {
          await vscode.window.showErrorMessage(`Failed to create session: ${err}`);
        }
      }
    }
  
    async joinCode() {
      const sessionName = await window.showInputBox({ prompt: 'Enter the name of the code sharing session' });
  
      if (sessionName) {
        const sessionRef = firebase.database().ref(`sessions/${sessionName}`);
  
        try {
          const snapshot = await sessionRef.once('value');
          const sessionData = snapshot.val();
  
          if (!sessionData) {
            await vscode.window.showErrorMessage(`Session '${sessionName}' not found`);
            return;
          }
  
          const userName = await window.showInputBox({ prompt: 'Enter your name' });
  
          if (userName) {
            const userRef = sessionRef.child(`users/${userName}`);
            await userRef.set(true);
  
            this.currentSession = sessionRef;
            userRef.onDisconnect().remove();
            sessionRef.child('code').on('value', this.onCodeChanged, this);
            await vscode.window.showInformationMessage(`Joined session: ${sessionName}`);
          }
        } catch (err) {
          await vscode.window.showErrorMessage(`Failed to join session: ${err}`);
        }
      }
    }
  
    async onCodeChanged(snapshot) {
      if (this.currentSession) {
        const code = snapshot.val();
        await vscode.window.activeTextEditor.edit(editBuilder => {
          const document = vscode.window.activeTextEditor.document;
          const lastLine = document.lineAt(document.lineCount - 1);
          const start = new vscode.Position(0, 0);
          const end = new vscode.Position(document.lineCount - 1, lastLine.text.length);
          const range = new vscode.Range(start, end);
          editBuilder.replace(range, code);
        });
      }
    }
  
    dispose() {
      this.shareCodeCommand.dispose();
      this.joinCodeCommand.dispose();
  
      if (this.currentSession) {
        this.currentSession.child('code').off('value', this.onCodeChanged, this);
        this.currentSession = null;
      }
    }
  }
  