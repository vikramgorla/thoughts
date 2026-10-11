---
title: "How to Simulate Keyboard"
date: 2008-08-17
section: professional
originalUrl: "https://vikramdotnet.blogspot.com/2008/08/how-to-simulate-keyboard.html"
originalAuthor: "Vikram Gorla"
source: blogger
draft: false
---

Have you wondered , How to ***Simulate a Keyboard*** through **.net application**...  
  
You can *programatically simulate a keyboard* , Which make the user viewing feel that as if you are typing sitting in front of the PC..  
  
You can send keys one by one to the system which pretends that user is typing the keys one by one....  
  
This is very simple.... You can just use one function for this which simulates the keyboard funtionality..  
  
**sendkeys.send(key)**  
  
The key may be a ***string, character or a special function key*** of the keyboard  
This types the key you have sent on the screen wherever the focus is...  
  
*The different possible values for key are :*  
  
BACKSPACE {BACKSPACE}, {BS}, or {BKSP}  
BREAK {BREAK}  
CAPS LOCK {CAPSLOCK}  
DEL or DELETE {DELETE} or {DEL}  
DOWN ARROW {DOWN}  
END {END}  
ENTER {ENTER}or ~  
ESC {ESC}  
HELP {HELP}  
HOME {HOME}  
INS or INSERT {INSERT} or {INS}  
LEFT ARROW {LEFT}  
NUM LOCK {NUMLOCK}  
PAGE DOWN {PGDN}  
PAGE UP {PGUP}  
PRINT SCREEN {PRTSC} (reserved for future use)  
RIGHT ARROW {RIGHT}  
SCROLL LOCK {SCROLLLOCK}  
TAB {TAB}  
UP ARROW {UP}  
F1 {F1}  
F2 {F2}  
F3 {F3}  
F4 {F4}  
F5 {F5}  
F6 {F6}  
F7 {F7}  
F8 {F8}  
F9 {F9}  
F10 {F10}  
F11 {F11}  
F12 {F12}  
F13 {F13}  
F14 {F14}  
F15 {F15}  
F16 {F16}  
Keypad add {ADD}  
Keypad subtract {SUBTRACT}  
Keypad multiply {MULTIPLY}  
Keypad divide {DIVIDE}  
  
To specify keys combined with any combination of the SHIFT, CTRL, and ALT keys, precede the key code with one or more of the following codes.  
  
**Key Code**  
SHIFT +  
CTRL ^  
ALT %  
  
To specify that any combination of SHIFT, CTRL, and ALT should be held down while several other keys are pressed, enclose the code for those keys in parentheses. For example, to specify to hold down SHIFT while E and C are pressed, use "+(EC)". To specify to hold down SHIFT while E is pressed, followed by C without SHIFT, use "+EC".  
To specify repeating keys, use the form {key number}. You must put a space between key and number. For example, {LEFT 42} means press the LEFT ARROW key 42 times; {h 10} means press H 10 times.  
  
Note Because there is no managed method to activate another application, you can either use this class within the current application or use native Windows methods, such as FindWindow and SetForegroundWindow, to force focus on other applications.  
  
Example[Visual Basic, C#] The following code example demonstrates how to use the Send method. To run the example, paste the following code in a form called Form1 containing a button called Button1. The button control's TabIndex property should be set to 0. When the example is running, double-click the form to trigger the button's click event. Ensure the events are connected to their event-handling methods.[Visual Basic]  
------------------------------------------------------------------------------------  
' Clicking Button1 causes a message box to appear.  
  
**Private Sub Button1\_Click(ByVal sender As System.Object, \_  
ByVal e As System.EventArgs) Handles Button1.Click**  
*MessageBox.Show("Click here!")*  
  
**End Sub**  
' Use the SendKeys.Send method to trigger the Button1 click event  
' and display the message box.  
  
**Private Sub Form1\_DoubleClick(ByVal sender As Object, \_  
ByVal e As System.EventArgs) Handles MyBase.DoubleClick**  
*'* Send the enter key; since the tab stop of Button1 is 0, this  
' will trigger the click event.  
*SendKeys.Send("{ENTER}")*  
**End Sub**  
------------------------------------------------------------------------------------
