---
title: Melbourne house price estimator
description: A small regression model, trained on Melbourne house sales, that estimates a house's price from its suburb, bedrooms and bathrooms. A Python and Flask API with a React frontend, all running in Docker.
date: 2024-09-01
stack: [Python, scikit-learn, pandas, Flask, React, TypeScript, Docker]
repo: https://github.com/ABaulderstone/melbourne-housing-price-estimator
---

## Why build it

Machine learning and data engineering were fairly foreign to me; I wanted to get a working understanding of them so I gave myself a couple of days to build something end to end. To keep the data side manageable, I used something I already knew well: Melbourne house prices. This also served as an introduction to Python for some of my students.

## The model

The training data is a set of around 35,000 Melbourne property sales from 2016 to 2018. Once I'd dropped the sales with no price, or with a missing suburb, bedroom or bathroom count, that left about 20,800 sales across 338 suburbs.

The model is a scikit-learn pipeline. The numbers get their gaps filled in and are scaled, the suburb is one-hot encoded, and the result feeds a linear regression:

```python
preprocessor = ColumnTransformer(transformers=[
    ('num', numeric_transformer, ['Rooms', 'Bathroom']),   # median imputer, then a standard scaler
    ('cat', categorical_transformer, ['Suburb']),          # one-hot encoding
])

pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                           ('regressor', LinearRegression())])
```

The training script holds back 20% of the sales to test against, prints the mean squared error and R² score, and saves the trained pipeline with joblib.

## The app

A Flask API loads the saved model and has two routes: `GET /suburbs` lists the suburbs the model knows about, and `POST /predict` takes a suburb, bedroom count and bathroom count and returns an estimate. The React frontend is a single form, built with React Hook Form and Zod. It's deliberately minimal, as the frontend wasn't the point of this project.

## Docker

Docker was the other thing I wanted practice with. One `docker compose up --build` starts both containers:

- **The API container** runs an entrypoint script that trains the model if it can't find a saved one, then starts Flask. The model is saved to a mounted volume, so training only happens on the first run.
- **The frontend container** runs Vite's dev server with the source mounted, so changes reload straight away. `node_modules` stays inside the container, so it doesn't clash with anything on the host.

## What I'd do differently

This was a couple of days of scrappy self-teaching, and the estimates show it:

- **The data is old.** The sales are from 2016 to 2018, and Melbourne prices have grown a lot since, so estimates come out low.
- **Suburb is a blunt feature.** Suburbs with only a few sales give the model little to go on. Latitude and longitude, or distance from the CBD, would probably work better.
- **Linear regression is a big assumption.** The relationship between bedrooms and price usually isn't a straight line, so a different kind of model would probably fit better.
