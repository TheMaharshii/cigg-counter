# Tapri

A mobile-first shared bill tracker for friends at a tapri, cafe, or casual hangout.

Tapri tracks **what was bought, who bought it, quantities, and the bill total for each session**.

## Features

- Add and manage friends and items, with default item prices
- Assign items to a friend and choose a quantity before adding
- Automatically merge repeated purchases of the same item by the same friend
- Review current item quantities, per-friend subtotals, and the session bill
- Name a session by its place; the name is retained if the page is reloaded before saving
- Save sessions and view today's history with each session's full date and time
- Group historical items by friend, view friend subtotals, and filter history by friend
- Open today's item, spending, session, and friend totals from the chart icon in the header
- Edit or delete friends and items, and delete saved sessions
- Save app data in the browser's `localStorage`; no backend is required
- Responsive mobile-first layout

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- [Lucide icons](https://lucide.dev/) loaded from a CDN
- DM Sans loaded from Google Fonts
- Browser `localStorage` for persistence

The app has no build step or package installation. The font and icon assets are fetched from external CDNs, so an internet connection may be needed to load them.

## Run

Open `index.html` in a browser, or serve the folder with a local static server such as the VS Code Live Server extension.

## Data

App data is stored per browser and device in `localStorage`. Clearing the browser's site data will remove saved friends, items, and sessions. History currently shows sessions saved on the current day.

## Project Structure

```text
tapri/
├── index.html
├── style.css
├── script.js
└── README.md
