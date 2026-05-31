Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
command = "cmd.exe /c cd /d " & Chr(34) & projectDir & Chr(34) & " && " & Chr(34) & projectDir & "\Запустить шашки.bat" & Chr(34)
shell.Run command, 0, False
