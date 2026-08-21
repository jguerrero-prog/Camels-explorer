CAMELS Explorer is a web app for browsing and plotting data from the CAMELS cosmological simulation suite.

## Requirements

- Python 3.9
- Node.js 20+

## Install

Clone the repo:

```
git clone https://github.com/jguerrero-prog/Camels-explorer.git
cd Camels-explorer
```

Set up the Python backend:

```
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Copy the env file and fill in any values it asks for:

```
cp .env.example .env
```

Install the frontend:

```
cd storybook
npm install
```

## Run

Start the backend (from the repo root, with `.venv` activated):

```
uvicorn api.main:app --reload --port 8010
```

Start the frontend (from `storybook/`):

```
npm run dev
```

Start Storybook (from `storybook/`, optional):

```
npm run storybook
```
