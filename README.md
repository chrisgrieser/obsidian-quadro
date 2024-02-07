# Quadro – Qualitative Data analysis Realized in Obsidian
![Plugin Store Download Count](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22quadro%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json&style=plastic)
![Last release](https://img.shields.io/github/v/release/chrisgrieser/obsidian-quadro?label=Latest%20Release&style=plastic)

Obsidian plugin for social-scientific Qualitative Data Analysis (QDA). An open
alternative to [MAXQDA](https://www.maxqda.com/) and
[atlas.ti](https://atlasti.com/), using Markdown to store data and research
codes.

## Table of Contents

<!-- toc -->

- [Introduction](#introduction)
	* [For Academics not familiar with Obsidian](#for-academics-not-familiar-with-obsidian)
	* [For Obsidian Users](#for-obsidian-users)
- [Usage](#usage)
	* [Coding in Quadro (Grounded Theory Methodology)](#coding-in-quadro-grounded-theory-methodology)
		+ [Assign codes](#assign-codes)
		+ [Rename codes](#rename-codes)
		+ [Delete codes](#delete-codes)
		+ [Investigate code co-occurrence](#investigate-code-co-occurrence)
		+ [Visualization of code relationships](#visualization-of-code-relationships)
	* [Extraction in Quadro (Qualitative Content Analysis)](#extraction-in-quadro-qualitative-content-analysis)
- [Installation](#installation)
- [Development](#development)
	* [Roadmap](#roadmap)
	* [Build](#build)
- [Credits](#credits)
	* [Acknowledgments](#acknowledgments)
	* [Recommended Citation](#recommended-citation)
	* [About the developer](#about-the-developer)

<!-- tocstop -->

## Introduction

### For Academics not familiar with Obsidian
This plugin utilizes the rich text-processing capabilities of
[Obsidian](https://obsidian.md/) to provide a lightweight application for
qualitative data analysis.

All data is stored as [Markdown](https://www.markdownguide.org/) files.
**Markdown** is a human-readable, non-proprietary, and commonly used open
standard for plaintext files. This means:
- There is no lock-in / dependency to a particular software, the data can be
  analyzed in any app supporting Markdown. (In fact, the data is stored in plain
  text and can thus even be opened with and read with `Notepad.exe` or
  `TextEdit.app`)
- The research data is therefore future-proof, fulfilling the requirement of
  long-term archiving of qualitative data. It is guaranteed that the data can
  still be read even in 50 years, a guarantee that does not exist for research
  conducted with proprietary research software such as `MAXQDA` or `atlas.ti`.
- The data is interoperable with other applications, meaning it can easily be
  combined with other text analysis tools such as
  [AntConc](https://www.laurenceanthony.net/software/antconc/), or with browser
  extensions like [MarkDownload](https://chromewebstore.google.com/detail/markdownload-markdown-web/pcmpcfapbekmbjjkdalcgopdkipoggdi)
  to fetch website contents.
- The markdown files are stored offline by default, meeting the key requirements
  for research ethics and protection of research data.

Being an Obsidian plugin, the Qualitative Data Analysis is embedded in the
extensive functionality and plugin ecosystem of Obsidian:
- The data analysis can employ the feature-set of Obsidian, which already has a
  strong focus on linked files. For instance, the [Graph
  View](https://help.obsidian.md/Plugins/Graph+view) can be used to create a
  visual network of codes, and [Outgoing
  Links](https://help.obsidian.md/Plugins/Outgoing+links) provides an overview
  of all data files a code is assigned to.
- The qualitative analysis is easily extended with a [comprehensive ecosystem of
  more than 1000 plugins](https://obsidian.md/plugins), for example
  [dataview](https://obsidian.md/plugins?id=dataview) for advanced data
  aggregation or [YTranscript](https://obsidian.md/plugins?id=ytranscript) for
  automatic fetching of YouTube video transcripts.
- All this allows the researcher to customize the analysis to the particular
  needs of their research. Case-specific adaption of research methods
  is a key demand of qualitative research (which strictly speaking is not
  truly fulfilled when using standardized, proprietary research software).
- Obsidian, as well as Quadro, both [have mobile support (Android and iOS)](https://obsidian.md/mobile).

If there is a more tech-savvy researcher in the research team, the advantages of
Quadro go even further:
- Being Open Source, this plugin can be modified and customized to fit their
  needs. (It is written is TypeScript / JavaScript, a particularly accessible
  and commonly used programming language.)
- By storing the data in markdown files, all research data can be fully
  version-controlled with `git`.

Obsidian is [free to use for academic purposes](https://obsidian.md/license),
and Quadro is also free to use. Especially for students writing their
theses, this saves a lot of unnecessary hassle with licenses.

### For Obsidian Users
This plugin basically creates "bidirectional" links between data files and
markdown files by inserting wikilinks at both files. It makes use of Obsidian's
[note-embedding](https://help.obsidian.md/Linking+notes+and+files/Embed+files#Embed+a+note+in+another+note)
functionality to keep track of coded text segments.

## Usage

### Coding in Quadro (Grounded Theory Methodology)
There are two basic types of files for the analysis, Code Files and Data Files,
which are both stored as [Markdown files](https://www.markdownguide.org/).

**Data Files**
The empirical material as text files. They can be stored anywhere in the vault
as `.md` files. (A separate subfolder named `Data` is recommended though.) As
Quadro assigns codes to whole paragraphs, these data files should
be split up into smaller segments.

When a code is assigned, a link to the corresponding code file and a unique
ID are appended to the paragraph:

```md
Filename: Data/Interview 1.md

Lorem ipsum dolor sit amet, qui minim labore adipisicing minim sint cillum sint
consectetur cupidatat. [[MyCode]] ^id42
```

**Code Files**
All markdown files in the folder `{vault-root}/Code-Files` are considered code
files.

When a code is assigned, a link back to the original location in the data file
is appended to the code file.

```md
Filepath: Code-Files/MyCode.md

- ![[Interview 1#^id42]]
```

As the link is a so-called [embedded
link](https://help.obsidian.md/Linking+notes+and+files/Embed+files#Embed+a+note+in+another+note),
Obsidian renders the respective paragraph of the data file inside the code
file:

![Embedded block link in reading & source Mode](./assets/embedded-blocklink_reading-and-source-mode.png)

> [!NOTE]
> The main caveat of this approach is that the assignment of codes is mostly
> restricted to the paragraph level. Assigning codes to only segments of a
> paragraph is limited to adding highlights to the respective section.
> Assignment of codes to individual words and coded segments with overlap are
> not supported.

#### Assign codes
Use `alt+c` to assign a code to the current paragraph.
- The hotkey can be customized in the Obsidian settings (command name `Quadro:
  Add Code`).
- Any selected text is also highlighted. (Note that overlapping highlights are
  not supported in Markdown.)
- Select the item `Create New Code` to create a new code, which is then
  assigned.

> [!TIP]
> You can create new codes in bulk by adding multiple `.md` to the `Code-Files`
> folder in the `Windows Explorer` / `Finder.app`. Any file created outside of
> Obsidian is nonetheless available inside Obsidian as an assignable code.

#### Rename codes
Use `F2` when at a code file to rename it.
- The hotkey can be customized in the Obsidian settings (command name `Rename
  file`).
- Right-clicking the file in the file explorer also works.
- All references to the code file are automatically updated.

> [!WARNING]
> Renaming code files outside of Obsidian does not trigger any updates of the
> references. This would therefore result in loss of research data.

#### Delete codes
WIP.

#### Investigate code co-occurrence
Co-occurrences of codes can be reviewed by using the [built-in Obsidian feature
for embedded search results](https://help.obsidian.md/Plugins/Search#Embed+search+results+in+a+note).

````md
```query
line:("[[MyCodeOne]]" "[[MyCodeTwo]]")
```
````

You can also perform fine-grained searches, such as boolean operators or
restricting the search scope to certain files. [See the documentation of
Obsidian's search syntax for more
details.](https://help.obsidian.md/Plugins/Search#Search+operators)

#### Visualization of code relationships
WIP.

```txt
```

[See the documentation of Obsidian's Graph View for more details.](https://help.obsidian.md/Plugins/Graph+view)

### Extraction in Quadro (Qualitative Content Analysis)
Extraction is implemented via Markdown metadata ([YAML frontmatter](https://docs.zettlr.com/en/core/yaml-frontmatter/)),
which is supported via [Obsidian Properties](https://help.obsidian.md/Editing+and+formatting/Properties).

WIP.

## Installation
**Manual**
1. Download the `.zip` file from the [latest
   release](https://github.com/chrisgrieser/obsidian-quadro/releases/latest).
2. Extract the `.zip` file into the `{your-vault-path}/.obsidian/plugins/quadro`.
3. In Obsidian, go to `Settings` → `Community Plugins`. Press the Refresh
   button.
4. Look for a new entry `Quadro` in the plugin list. Enable the plugin by
   checking the box.

Alternatively, if you are already familiar with the Obsidian Ecosystem, you can
also install the plugin via [BRAT](https://github.com/TfTHacker/obsidian42-brat).

**Obsidian Community Plugin Store**
When published in the Obsidian Community Store, it is going to be available in
Obsidian's Plugin Browser via: `Settings` → `Community Plugins` → `Browse` →
Search for *"Quadro"*

## Development

### Roadmap
- [ ] Add Graph View Example.
- [ ] Delete Code from Code-File and Data-File.
- [ ] Implement Extraction.
- [ ] Submit to Obsidian Community Plugin Store.
- [ ] Example Vault.

### Build

```bash
git clone "git@github.com:chrisgrieser/obsidian-quadro.git"
make init
```

<!-- vale Google.FirstPerson = NO -->
## Credits

### Acknowledgments
- [Ryan Murphy](https://fulcra.design/About/), who gave me the idea for this
  project with a [blogpost of
  his](https://fulcra.design/Posts/An-Integrated-Qualitative-Analysis-Environment-with-Obsidian/).
- [Grit Laudel](http://www.laudel.info/), for providing sample interview data.# Acknowledgments

### Recommended Citation
Please cite this software project as (APA):

```txt
Grieser, C. (2024). Quadro – Qualitative Data Analysis Realized in Obsidian [Computer software]. 
https://github.com/chrisgrieser/obsidian-qualitative-data-analysis
```

For other citation styles, use the following metadata:
- [Citation File Format (.cff)](./recommended-citation/CITATION.cff)
- [BibTeX (.bib)](./recommended-citation/CITATION.bib)

### About the developer
I am a sociologist studying the social mechanisms underlying the
digital economy. For my PhD project, I investigate the governance of the app
economy and how software ecosystems manage the tension between innovation and
compatibility. If you are interested in this subject, feel free to get in touch.

- [Academic Website](https://chris-grieser.de/)
- [ResearchGate](https://www.researchgate.net/profile/Christopher-Grieser)
- [Discord](https://discordapp.com/users/462774483044794368/)
- [GitHub](https://github.com/chrisgrieser/)
- [Twitter](https://twitter.com/pseudo_meta)
- [Mastodon](https://pkm.social/@pseudometa)
- [LinkedIn](https://www.linkedin.com/in/christopher-grieser-ba693b17a/)

<a href='https://ko-fi.com/Y8Y86SQ91' target='_blank'>
<img height='36' style='border:0px;height:36px;'
src='https://cdn.ko-fi.com/cdn/kofi1.png?v=3' border='0' alt='Buy Me a Coffee at
ko-fi.com' /></a>
