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

[![](https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiHKbY9bUh2z3KO7lpqOt8gWBMkq_Fp-6UfSQdFd1EzFq_rokyaIhW1peVSQ2n2cDCtMZXoEw9q6HHWvk-aL_yBVflpEiFZzQ_6CnTsgJFXe9YagW_myOP8IYJHUiyjqGbs-8WYMRJJGnI/s320/Toolbox.JPG)](https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiHKbY9bUh2z3KO7lpqOt8gWBMkq_Fp-6UfSQdFd1EzFq_rokyaIhW1peVSQ2n2cDCtMZXoEw9q6HHWvk-aL_yBVflpEiFZzQ_6CnTsgJFXe9YagW_myOP8IYJHUiyjqGbs-8WYMRJJGnI/s1600-h/Toolbox.JPG) You can Fill your form the form by this browser, by Selection Option Dock in Parent Container.

[![](https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjhXsNpZCP38HXJS4AdlBLwSnX0KUPQ7qUEFMycwOmwmd7S-LD8lP9CXauPEwbBIkaZilMzbzRwNxpjNiqjJV5qS3pqiHKUQ3atvePktDMkdLrvhAzB3gx-brZp3PI2qJaaWmj8IeYhGjA/s320/dock.jpg)](https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjhXsNpZCP38HXJS4AdlBLwSnX0KUPQ7qUEFMycwOmwmd7S-LD8lP9CXauPEwbBIkaZilMzbzRwNxpjNiqjJV5qS3pqiHKUQ3atvePktDMkdLrvhAzB3gx-brZp3PI2qJaaWmj8IeYhGjA/s1600-h/dock.jpg)

[![](https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEizXy62hnHqFxBvbQnBL7PUDVJB1mUWbilZn5lnhXuFvuyUZ6dDtoL-hb2uBjpxpyVdSOWG762DnrIlzrfbzEjQ4bwRveHfuXvx503DBb3ze_YFjDGl2twXdY_yuHK_PF0eOJnt4Qmoixc/s320/anchor.jpg)](https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEizXy62hnHqFxBvbQnBL7PUDVJB1mUWbilZn5lnhXuFvuyUZ6dDtoL-hb2uBjpxpyVdSOWG762DnrIlzrfbzEjQ4bwRveHfuXvx503DBb3ze_YFjDGl2twXdY_yuHK_PF0eOJnt4Qmoixc/s1600-h/anchor.jpg)Or else you can set the bounds with anchor property in Web Browser Properties.

  

[![](https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjHxi5ng2Zr8SZN7HrS4QuNVAmm5X03oy_uSTmJzWChn9X1cNzr_6gqYvZG2B-KE2PzLb4NUFJlq5ONjwiZg1b-WPiKrpi_hvkDg3iLuJqrWy2xXUSx633se9s8Xqn-rsmyWPc3pipnRD8/s320/url.JPG)](https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjHxi5ng2Zr8SZN7HrS4QuNVAmm5X03oy_uSTmJzWChn9X1cNzr_6gqYvZG2B-KE2PzLb4NUFJlq5ONjwiZg1b-WPiKrpi_hvkDg3iLuJqrWy2xXUSx633se9s8Xqn-rsmyWPc3pipnRD8/s1600-h/url.JPG)

To Specify the Default Url, to be loaded when the web browser is loaded, the Url propety is set in the properties. For the page to be blank specify **about:blank** in the Url property

Some websites will have same ignorable script errors which will pop up as [![](https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj6nFMjOFWJ10cr84NFLF4gRloidRCMhp48n3dIioNJK0ZwyXNtoI2NklMsIkN1vPsLlBetg-U0f9KJJkrAeAsNQAnXvVZvRJ_tBW-Ngh5HV37E7xvmRjLKZ2V44TBwovtlo37hveCEzMM/s320/scripts.JPG)](https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj6nFMjOFWJ10cr84NFLF4gRloidRCMhp48n3dIioNJK0ZwyXNtoI2NklMsIkN1vPsLlBetg-U0f9KJJkrAeAsNQAnXvVZvRJ_tBW-Ngh5HV37E7xvmRjLKZ2V44TBwovtlo37hveCEzMM/s1600-h/scripts.JPG)an error during navigation , which can be avoided using ScriptErrorsSupressed Property and Scroll bars can be enabled using ScrollBarsEnabled Property

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
