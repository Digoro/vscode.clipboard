# Clipboard
Simply Clibboard like jetbrain clipboard

## Features

### Copy
It's like a normal copy and cut.
* **window, linux:** `ctrl + c`
* **mac:** `command + c`

### Cut
* **window, linux:** `ctrl + x`
* **mac:** `command + x`

### Paste from clipboard history
There are two ways to paste.  
#### First
1. open clipboard sidebar.
2. hover clipboard item that you want copy.
3. click copy button.

![Alt Text](resources/sidebar.gif)


#### Second
1. open QuickPick with `shift + ctrl + v` or `shift + command + v`
2. select you want copy.

![Alt Text](resources/quickPick.gif)

## Extension Setting
```
{
    // Maximum number of clips to save (default: 200)  
    clipboard.maximumClips: 200
}
```