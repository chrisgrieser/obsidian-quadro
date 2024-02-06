# Quadro – Qualitative Data analysis Realized in Obsidian
![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22quadro%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json&style=plastic)
![Last Release](https://img.shields.io/github/v/release/chrisgrieser/obsidian-quadro?label=Latest%20Release&style=plastic)

Obsidian Plugin for social-scientific Qualitative Data Analysis (QDA). An open
alternative to `MAXQDA` and `atlas.ti`, using Markdown to store data and
research codes.

> [!WARNING]
> This plugin is still WIP and as such not yet usable.

<!-- toc -->

- [Introduction](#introduction)
	* [For Academics not familiar with Obsidian](#for-academics-not-familiar-with-obsidian)
	* [For Obsidian Users](#for-obsidian-users)
- [Usage](#usage)
- [Installation](#installation)
- [Roadmap](#roadmap)
- [Recommended Citation](#recommended-citation)
- [About the developer](#about-the-developer)

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
  [AntConc](https://www.laurenceanthony.net/software/antconc/).
- The markdown files are stored offline by default, meeting the key requirements
  for research ethics and protection of research data.

Being an Obsidian plugin, the Qualitative Data Analysis is embedded in the
extensive functionality and plugin ecosystem of Obsidian:
- The data analysis can employ the full feature-set of Obsidian, which already
  focuses on linked files. For instance, the [Graph
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
Use `alt+c` to add a code to the current segment. The hotkey can be customized
in the Obsidian settings, the command name is `Quadro: Add Code`.

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

## Roadmap
- [ ] New Code creation.
- [ ] Fuzzy-matching suggester.
- [ ] Detailed usage instructions.
- [ ] Define Specification for `qda-markdown` format.
- [ ] Submit to Obsidian Community Plugin Store.
- [ ] Configurable Code-folder

## Recommended Citation
Please cite this software project as (APA):

```txt
Grieser, C. (2024). Quadro – Qualitative Data Analysis Realized in Obsidian [Computer software]. 
https://github.com/chrisgrieser/obsidian-qualitative-data-analysis
```

For other citation styles, use the following metadata:
- [Citation File Format](./recommended-citation/CITATION.cff)
- [BibTeX](./recommended-citation/CITATION.bib)

<!-- vale Google.FirstPerson = NO -->
## About the developer
In my day job, I am a sociologist studying the social mechanisms underlying the
digital economy. For my PhD project, I investigate the governance of the app
economy and how software ecosystems manage the tension between innovation and
compatibility. If you are interested in this subject, feel free to get in touch.

**Profiles**  
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
