# Releases

Исходный код игры хранится в git-репозитории.

Готовые версии для игроков лучше публиковать через GitHub Releases:

1. Собрать приложение:

```powershell
npm install
npm run build
```

2. Взять готовый файл:

```text
dist/Checkers Online.exe
```

3. Создать GitHub Release с версией, например:

```text
v0.1.0
```

4. Прикрепить к релизу:

```text
Checkers Online.exe
```

VPN-установщик и `node_modules` в git не добавляются.
