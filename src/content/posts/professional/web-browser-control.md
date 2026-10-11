---
title: "Web Browser Control"
date: 2008-09-12
section: professional
originalUrl: "https://vikramdotnet.blogspot.com/2008/09/web-browser-control.html"
originalAuthor: "Vikram Gorla"
source: blogger
draft: false
---

Web Browser Control is a Handy Component , which can be used for website navigation, data extraction, navigation event handling, event overriding, etc,... This component is available in windows application of .Net

[![](/images/web-browser-control/toolbox.webp)](/images/web-browser-control/toolbox.webp) You can Fill your form the form by this browser, by Selection Option Dock in Parent Container.

[![](/images/web-browser-control/dock.webp)](/images/web-browser-control/dock.webp)

[![](/images/web-browser-control/anchor.webp)](/images/web-browser-control/anchor.webp)Or else you can set the bounds with anchor property in Web Browser Properties.

  

[![](/images/web-browser-control/url.webp)](/images/web-browser-control/url.webp)

To Specify the Default Url, to be loaded when the web browser is loaded, the Url propety is set in the properties. For the page to be blank specify **about:blank** in the Url property

Some websites will have same ignorable script errors which will pop up as [![](/images/web-browser-control/scripts.webp)](/images/web-browser-control/scripts.webp)an error during navigation , which can be avoided using ScriptErrorsSupressed Property and Scroll bars can be enabled using ScrollBarsEnabled Property

Major Event and Methods of Web Browser :

1. Public Sub Navigate(ByVal urlString As String)

**Summary:**  
Loads the document at the specified Uniform Resource Locator (URL) into the System.Windows.Forms.WebBrowser control, replacing the previous document.

2. Public Function GoForward() As Boolean

**Summary:**  
Navigates the System.Windows.Forms.WebBrowser control to the next page in the navigation history, if one is available.

3. Public Function GoBack() As Boolean  
**Summary:**

Navigates the System.Windows.Forms.WebBrowser control to the previous page in the navigation history, if one is available.

4. Public Overrides Sub Refresh()

**Summary:**  
Reloads the document currently displayed in the System.Windows.Forms.WebBrowser control by checking the server for an updated version.

5. Public Sub [Stop]()

**Summary:**  
Cancels any pending navigation and stops any dynamic page elements, such as background sounds and animations.
