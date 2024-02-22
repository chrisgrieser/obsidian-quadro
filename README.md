# Quadro – Qualitative Data analysis Realized in Obsidian
![Plugin Store Download Count](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22quadro%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json&style=plastic)
![Last release](https://img.shields.io/github/v/release/chrisgrieser/obsidian-quadro?label=Latest%20Release&style=plastic)

Obsidian plugin for social-scientific Qualitative Data Analysis (QDA). An open
alternative to [MAXQDA](https://www.maxqda.com/) and
[atlas.ti](https://atlasti.com/), using Markdown to store data and research
codes.

*Quadro* supports both, coding in the style of *Grounded Theory* and extraction in
the style of *Qualitative Content Analysis*.

## Table of Contents

<!-- toc -->

- [Introduction](#introduction)
	* [For academics not familiar with Obsidian](#for-academics-not-familiar-with-obsidian)
	* [For Obsidian users not familiar with QDA](#for-obsidian-users-not-familiar-with-qda)
	* [Brief methodological comparison with other QDA software](#brief-methodological-comparison-with-other-qda-software)
- [Usage](#usage)
	* [Get Started](#get-started)
		+ [Example Vault](#example-vault)
		+ [Experienced Obsidian Users](#experienced-obsidian-users)
		+ [Migrating from an existing research project with other QDA software](#migrating-from-an-existing-research-project-with-other-qda-software)
	* [Coding](#coding)
		+ [How coding works in Quadro](#how-coding-works-in-quadro)
		+ [Coding capabilities](#coding-capabilities)
	* [Extraction](#extraction)
		+ [How extraction works in Quadro](#how-extraction-works-in-quadro)
		+ [Extraction capabilities](#extraction-capabilities)
- [Technical](#technical)
	* [Installation](#installation)
	* [Update](#update)
	* [Bug Reports & Feature Requests](#bug-reports--feature-requests)
	* [Development](#development)
- [Credits](#credits)
	* [Acknowledgments](#acknowledgments)
	* [Recommended citation of this project](#recommended-citation-of-this-project)
	* [About the developer](#about-the-developer)

<!-- tocstop -->

## Introduction

### For academics not familiar with Obsidian
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
- Obsidian, as well as *Quadro*, both [have mobile support (Android and iOS)](https://obsidian.md/mobile).

If there is a more tech-savvy researcher in the research team, the advantages of
*Quadro* go even further:
- Being Open Source, this plugin can be modified and customized to fit their
  needs. (It is written is TypeScript / JavaScript, a particularly accessible
  and commonly used programming language.)
- By storing the data in markdown files, all research data can be fully
  version-controlled with `git`.

Obsidian is [free to use for academic purposes](https://obsidian.md/license),
and *Quadro* is also free to use. Especially for students writing their
theses, this saves a lot of unnecessary hassle with licenses.

### For Obsidian users not familiar with QDA
In Qualitative Data Analysis, "coding" is a form of fine-grained tagging of text
segments, and "extraction" is a transforming prose text into structured data.

*Coding* is implemented in *Quadro* via "bidirectional" links between Data Files
and Code Files by inserting wikilinks in *both* files. (Obsidian itself does
have backlinks, but those are unidirectional links, since the implicit backlink
is only inferred and not stored anywhere in the markdown file.).

It makes use of Obsidian's
[note-embedding](https://help.obsidian.md/Linking+notes+and+files/Embed+files#Embed+a+note+in+another+note)
functionality to keep track of coded text segments.
- Codes are implemented as `[[wikilinks]]` instead of `#tags`, as the former
  allows for more flexibility, such as having separate file per code.
- The distinct feature of this plugin is that its commands *always* make edits
  to two files (the data and the code file) *at the same time*, which is
  necessary to adequately handle the workflow common to coding in QDA.

*Extraction* is implemented by creating separate Extract Files for each
extraction, using [YAML
frontmatter](https://docs.zettlr.com/en/core/yaml-frontmatter/) to store the
data in a structured form. Quadro uses a simplistic templating mechanism to
support the creation of those Extraction Files.

### Brief methodological comparison with other QDA software

**Advantages**
- **Interoperability**: Can be freely combined with other QDA software.
- **Flexibility**: You can use codes, extractions, or freely combine both.
- **Customizability**: Implicit assumptions of QDA software, such as the initial
  order in which codes are presented in the code selection modal, can be
  customized to deal with different kinds of coder biases.

**Disadvantages**
- The **unit of coding** is restricted to paragraphs and, to a degree, segments
  of a paragraph. Coding of individual words is not supported.
- Due to the nature of Markdown markup, assigning multiple codes to **partially
  overlapping paragraph segments** is not supported. This restriction only
  applies to partial overlaps, assigning multiple codes to the same paragraph or
  segment works, of course.

## Usage

### Get Started
It is recommended to create a separate vault for data analysis and
install the plugin there, for several reasons:
- QDA does not follow the "common logic of note-taking," thus often requiring a
  different set of plugins and settings from your regular vault.
- Separate vaults mean that suggestions, such as for properties, are also
  separated.
- To make Obsidian easier to use for qualitative research, *Quadro* also does
  some (minor) modifications to the core layout of Obsidian, for instance wider
  dataview tables.

#### Example Vault
There is a [pre-configured example
vault](https://github.com/chrisgrieser/obsidian-quadro) to be used with
*Quadro*. Apart from some pre-installed plugins for QDA, it includes some mock
data with exemplary codes and extractions, and showcases of extraction
capabilities, to demonstrate the capabilities of *Quadro*.

1. [Download the vault](https://github.com/chrisgrieser/quadro-example-vault/releases/latest/download/quadro-example-vault.zip).
2. Open the directory `quadro-example-vault` as an Obsidian vault. ([If you are
   new to Obsidian, see the Obsidian Documentation on how to do
   that.](https://help.obsidian.md/Getting+started/Create+a+vault#Open+existing+folder))

#### Experienced Obsidian Users
If you are experienced with Obsidian, you can also [directly install the
plugin](#installation), though checking out the example vault is nonetheless
helpful to get a grasp on the capabilities of *Quadro*.

#### Migrating from an existing research project with other QDA software
Unfortunately, this is not supported. Main reason being that commercial QDA
software use proprietary formats, the exact reason why researchers should
use research software using open formats to begin with.

If your research data is
saved in [Markdown, Obsidian is able to import
them](https://help.obsidian.md/import/markdown) though. Importing from [various
other note-taking apps like Notion, Evernote, OneNote, Google Keep, Apple Notes,
Bear, or Roam](https://help.obsidian.md/import) is supported as well.

It is, however, possible to export the results done with *Quadro*, to
collaborate with other researchers. You can either export individual files as
PDF, or [export aggregated results as CSV](https://help.obsidian.md/import).

### Coding

#### How coding works in Quadro
There are two basic types of files for the analysis, Data Files and Code Files,
which are both stored as [Markdown files](https://www.markdownguide.org/).

**Data Files**
The empirical material as text files. They can be stored anywhere in the vault
as `.md` files. (A separate subfolder named `Data` is recommended though.) As
*Quadro* assigns codes to whole paragraphs, these data files should
be split up into smaller segments.

When a code is assigned, a link to the corresponding Code File and a unique
ID are appended to the paragraph:

```md
Filename: ./Data/Interview 1.md

Lorem ipsum dolor sit amet, qui minim labore adipisicing minim sint cillum sint
consectetur cupidatat. [[MyCode]] ^id42
```

**Code Files**
All markdown files in the folder `{vault-root}/Codes` are considered code
files.

When a code is assigned, a link back to the original location in the data file
is appended to the code file.

```md
Filepath: ./Codes/MyCode.md

![[Interview 1#^id42]]
```

As the link is a so-called [embedded
link](https://help.obsidian.md/Linking+notes+and+files/Embed+files#Embed+a+note+in+another+note),
Obsidian renders the respective paragraph of the data file inside the code
file:

![Embedded block link in reading & source mode](./assets/embedded-blocklink_reading-and-source-mode.png)

The underlying folder structure for coding looks like this (with the colors
representing codes):

```txt
.
├── 📂 Data
│   ├── 📄 Interview 1.md
│   ├── 📄 Field Notes 1.md
│   └── …
└── 📂 Coding
    ├── 📄 blue.md
    ├── 📄 red.md
    └── 📂 Group 1
         ├── 📄 white.md
         ├── 📄 black.md
         └── …
```

> [!NOTE]
> The main caveat of this approach is that the assignment of codes is mostly
> restricted to the paragraph level. Assigning codes to only segments of a
> paragraph is limited to adding highlights to the respective section.
> Assignment of codes to individual words and coded segments with overlap are
> not supported.

#### Coding capabilities

| Action                                    | Description                                                                                                                                                                                                         |           Sidebar Button           | Default Hotkey | Capability Provider                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------: | :------------: | ----------------------------------------------- |
| Assign code                               | Assign a code to the current paragraph, any selected text is highlighted. (overlapping highlights not supported though). <br><br>Select `Create new code` to create a new code file and assign it to the paragraph. | ![Icon](./assets/plus-circle.svg)  | `mod+shift+a`  | Quadro                                          |
| Rename code                               | All references to the Code File are automatically updated. (You can also rename by right-clicking a file or link and selecting "Rename.")                                                                           | ![Icon](./assets/circle-slash.svg) | `mod+shift+r`  | [Obsidian Built-in][rename]                     |
| Delete code from paragraph                | Removes a code from the current paragraph of a Data File or Code File. The reference is also removed from the corresponding other file.                                                                             | ![Icon](./assets/minus-circle.svg) | `mod+shift+d`  | Quadro                                          |
| Delete Code File and all references to it | Moves the Code File to the trash, *and* deletes all references to it.                                                                                                                                               |   ![Icon](./assets/x-circle.svg)   |       —        | Quadro                                          |
| Merge codes                               | All references to the original Code Files are updated to point to the Code File.                                                                                                                                    |    ![Icon](./assets/radius.svg)    |       —        | [Obsidian Core Plugin: Note Composer][composer] |
| Bulk-create new codes                     | Create multiple new codes at once (without assigning them to a paragraph).                                                                                                                                          | ![Icon](./assets/circle-dashed.svg)|       —        | Quadro                                          |
| Code grouping                             | Codes can be arranged in subfolders via drag-and-drop in the File Explorer.                                                                                                                                         |                 —                  |       —        | [Obsidian Built-in][move-file]                  |
| Visualization of code relationships       | In the Graph View, use a query like `path:Codes OR path:Data`, and assign Data and Codes to different groups. <br><br>[Further Documentation][graph]                                                                |   ![Icon](./assets/git-fork.svg)   |    `mod+g`     | [Obsidian Core Plugin: Graph View][graph]       |
| Investigation of code co-occurrences      | In the Obsidian Search, use a query such as `line:([[MyCodeOne]] [[MyCodeTwo]])`. <br><br>[Further Documentation][search]                                                                                           |                 —                  | `mod+shift+f`  | [Obsidian Core Plugin: Search][search]          |

[composer]: https://help.obsidian.md/Plugins/Note+composer
[rename]: https://help.obsidian.md/Files+and+folders/Manage+notes#Rename+a+note
[graph]: https://help.obsidian.md/Plugins/Graph+view
[search]: https://help.obsidian.md/Plugins/Search#Search+operators
[move-file]: https://help.obsidian.md/Plugins/File+explorer#Move+a+file+or+folder

`mod` refers the `ctrl` on Windows and to `cmd` on macOS. Every hotkey can be
customized by searching in the Obsidian hotkey settings for the name of the
respective action.

> [!WARNING]
> Renaming, or moving Code/Data Files **must** be done from within
> Obsidian. Doing so in the Windows Explorer or macOS Finder does not trigger
> the automatic updating of references, meaning a loss of information.

### Extraction

#### How extraction works in Quadro
Extraction is implemented similarly to coding, using two basic file types, Data
Files and Extraction Files.

**Data Files**
The empirical material as text files. They can be stored anywhere in the vault
as `.md` files.

When making an extraction, a link to the corresponding Extraction File and a
unique ID are appended to the paragraph, just like with coding:

```md
Filename: ./Data/Interview 2.md

Lorem ipsum dolor sit amet, qui minim labore adipisicing minim sint cillum sint
consectetur cupidatat. [[Career Visions/1]] ^id23
```

**Extraction Files**
Extraction is implemented via Markdown metadata ([YAML frontmatter](https://docs.zettlr.com/en/core/yaml-frontmatter/)),
which is supported via [Obsidian Properties](https://help.obsidian.md/Editing+and+formatting/Properties).

When making an extraction, you are presented with a choice of your extraction
types. Upon selection, a new file is created in the folder that groups
extractions, that is `{vault-root}/Extractions/{Extraction Group}/`. As
such, each file corresponds to a single extraction, with its parent folder
indicating what type of extraction it is.

You can then fill out the fields of newly created file. The
`extraction source` key contains a link back to the location in the Data File
where you initiated the extraction. In the rendered view, the file contains a
`Properties` headily that can conveniently be filled out:

![Showcase Extraction](./assets/showcase-extraction.png)

The underlying plaintext view of the file looks like this:

```md
Filepath: ./Extractions/Career Visions/1.md

---
occupation: "painter"
career stage: "novice"
year of experience: 4
extraction date: 2024-02-12
extraction source: "[[Field Notes 3]]"
---

**Paragraph extracted from:** ![[Field Notes 3#^id-42]]
```

**Extraction Templates (Extraction Types)**
The available extraction types are determined by the subfolders of
`{vault-root}/Extractions/`. The fields that are created for filling in
information are determined by the `Template.md` file located in that subfolder.
For the example above, the Extraction Template looks like this:
The corresponding template for the extraction type is located in the same
folder, but has the filename `Template.md`.

```md
Filepath: ./Extractions/Career Visions/Template.md

---
occupation: ""
career stage: ""
year of experience: 
---
```

All in all, the underlying folder structure for extractions looks like this:

```txt
.
├── 📂 Data
│   ├── 📄 Interview 1.md
│   ├── 📄 Field Notes 1.md
│   └── …
└── 📂 Extractions
    ├── 📂 Career Obstacles
    │    ├── 📄 Template.md
    │    ├── 📄 1.md
    │    ├── 📄 2.md
    │    └── …
    └── 📂 Career Visions
         ├── 📄 Template.md
         ├── 📄 1.md
         └── …
```

#### Extraction capabilities

| Action                     | Description                                                                                              |              Sidebar Button             | Default Hotkey | Capability Provider                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------- | :-------------------------------------: | :------------: | -------------------------------------- |
| Extract from paragraph     | Creates an Extraction File from Extraction Template.                                                     |    ![Icon](./assets/plus-square.svg)    | `mod+shift+e`  | Quadro                                 |
| Create new extraction type | Creates a new Extraction Type (= a new subfolder in "Extractions," alongside a new Extraction Template). | ![Icon](./assets/box-select.svg)        |       /        | Quadro                                 |
| Aggregate extractions      | Create table that aggregates Extraction Files.      <br><br>[Further Documentation][dataview]            | ![Icon](./assets/sigma-square.svg)      |       /        | [Community Plugin: Dataview][dataview] |

[dataview]: https://blacksmithgu.github.io/obsidian-dataview/

`mod` refers the `ctrl` on Windows and to `cmd` on macOS. Every hotkey can be
customized by searching in the Obsidian hotkey settings for the name of the
respective action.

## Technical

### Installation
**Manual**  
1. Download the `.zip` file from the [latest
   release](https://github.com/chrisgrieser/obsidian-quadro/releases/latest).
2. Extract the `.zip` file into the
   `{your-vault-path}/.obsidian/plugins/quadro`. (Note that on macOS,
   `.obsidian` is a hidden folder. You can make hidden folders visible by
   pressing `cmd+shift+.` in the Finder.)
3. In Obsidian, go to `Settings` → `Community plugins`. Press the Refresh
   button.
4. Look for a new entry `Quadro` in the plugin list. Enable the plugin by
   checking the box.

**BRAT (Beta Reviewers Auto-update Tester)**  
Alternatively, if you are already familiar with the Obsidian Ecosystem, you can
also install the plugin via [BRAT](https://github.com/TfTHacker/obsidian42-brat).

**Obsidian Community Plugin Store**  
Once published in the Obsidian Community Plugin Store, *Quadro* is going to be
available in Obsidian's Plugin Browser via: `Settings` → `Community plugins` →
`Browse` → Search for *"Quadro"*

### Update
**Manual**
1. Close Obsidian.
2. Download the `.zip` file from the [latest
   release](https://github.com/chrisgrieser/obsidian-quadro/releases/latest).
3. Extract the `.zip` file into the
   `{your-vault-path}/.obsidian/plugins/quadro`, replacing the existing files in
   that folder.
4. Launch Obsidian again.

**BRAT**  
If you have added the plugin via *BRAT*, it automatically checks for new
updates every time you start Obsidian and automatically updates *Quadro* if there
is a new version available.

**Obsidian Community Plugin Store**  
Once published in the Obsidian Community Plugin Store, you can update *Quadro*
(and all other plugins you have installed) via: `Settings` → `Community plugins`
→ `Check for updates` → `Update All`.

### Bug Reports & Feature Requests
- For bug reports or feature requests, please use the [GitHub issue tracker](https://github.com/chrisgrieser/obsidian-quadro/issues).
- For questions and general discussion about *Quadro*, use the [GitHub
  Discussion
  Forum](https://github.com/chrisgrieser/obsidian-quadro/discussions).

### Development

```bash
git clone "git@github.com:chrisgrieser/obsidian-quadro.git"
make init
```

```bash
make format # run all formatters
make build # builds the plugin
make check # runs the pre-commit hook (without committing)
```

> [!NOTE]
> This repo uses a pre-commit hook, which prevents commits that do not build or
> do not pass all the checks.

<!-- vale Google.FirstPerson = NO -->
## Credits

### Acknowledgments
- [Ryan Murphy](https://fulcra.design/About/) who gave me the idea for this
  project with a [blogpost of
  his](https://fulcra.design/Posts/An-Integrated-Qualitative-Analysis-Environment-with-Obsidian/).
- [Grit Laudel](http://www.laudel.info/) who provided sample interview data.

### Recommended citation of this project
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

*For bug reports and features requests, please use the [GitHub issue tracker](https://github.com/chrisgrieser/obsidian-quadro/issues).*

<a href='https://ko-fi.com/Y8Y86SQ91' target='_blank'>
<img height='36' style='border:0px;height:36px;'
src='https://cdn.ko-fi.com/cdn/kofi1.png?v=3' border='0' alt='Buy Me a Coffee at
ko-fi.com'/></a>
