import readline from "readline";
import { EventEmitter } from "node:events";

export const CSI = "\x1b[";
export const ANSIES = {
    EnableAlternateBuffer: CSI + "?1049h",
    DisableAlternateBuffer: CSI + "?1049l",
    HideCursor: CSI + "?25l",
    ShowCursor: CSI + "?25h",
    MoveCursortToTopLeftCorner: CSI + "1;1H",
    ClearScreen: CSI + "3J",
}

export function initInput() {
    process.stdout.write(ANSIES.EnableAlternateBuffer);
    process.stdout.write(ANSIES.HideCursor);
    // Allows us to listen for events from stdin
    readline.emitKeypressEvents(process.stdin);

    // Raw mode gets rid of standard keypress events and other
    // functionality Node.js adds by default
    process.stdin.setRawMode(true);

    // Start the keypress listener for the process
    // const input = new EventEmitter();
    process.stdin.on('keypress', (str, key) => {
        // "Raw" mode so we must do our own kill switch
        if (key.sequence === '\u0003') { // ctrl+c
            process.stdout.write(ANSIES.DisableAlternateBuffer);
            process.stdout.write(ANSIES.ShowCursor);
            process.exit();
        }
    });

    return { input: process.stdin };
}
