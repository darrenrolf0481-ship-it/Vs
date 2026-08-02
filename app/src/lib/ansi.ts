/**
 * Strip ANSI/VT control sequences from shell output.
 *
 * Real shells emit escape sequences for colors, cursor movement, and window
 * titles. Rendering them literally produces garbage like "\u001b]0;user@host".
 * Since this terminal appends text rather than emulating a full screen buffer,
 * the correct behaviour is to remove the control codes and keep the text.
 */

// CSI sequences (colors, cursor moves): ESC [ ... final-byte
const CSI = /\u001b\[[0-?]*[ -/]*[@-~]/g;
// OSC sequences (window title etc.): ESC ] ... BEL or ESC \
const OSC = /\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g;
// Two-character escapes: ESC followed by a single byte
const SIMPLE = /\u001b[@-Z\\-_]/g;
// Lone control characters that would render as boxes (keep \n, \r, \t)
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

export function stripAnsi(input: string): string {
  return input
    .replace(OSC, '')
    .replace(CSI, '')
    .replace(SIMPLE, '')
    .replace(CONTROL, '')
    // Normalize bare CR (used for progress bars) so lines don't stack oddly
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}
