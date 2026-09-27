# Changelog

Releases are tagged and published through the `release` GitHub Actions workflow, which builds each release's notes from the commits since the previous tag. See the [Releases page](https://github.com/otnc/skills_ai-agent-saving-tech/releases) for the version history.

To cut a release, bump `version` in `package.json` and `metadata.version` in every `skills/*/SKILL.md`, push, then run the workflow with the same version. It fails if any of them disagree.
