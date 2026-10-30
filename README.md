# Medium Clone API (NestJS)

The backend for [mediumclone-ngrx](https://github.com/serj7220/mediumclone-ngrx). A REST API for a Medium style blog that follows the [RealWorld](https://github.com/gothinkster/realworld) spec: users, articles, feeds, tags, favorites and follows.

This is a learning project from the same course. As a frontend developer I built it to understand the server side of the app I was working on: how the API, authentication and database fit together.

## Features

- Sign up and sign in with JWT; read and update the current user
- Articles: create, read, update, delete; the slug is made from the title plus a short random suffix
- Global list of articles with filters by tag, author and favorited user, a personal feed from followed users, and pagination
- Favorite and unfavorite articles
- User profiles, follow and unfollow
- Tags

## API

| Method | Path | Auth |
|---|---|---|
| POST | `/users` | |
| POST | `/users/login` | |
| GET, PUT | `/user` | yes |
| GET | `/articles` | optional |
| GET | `/articles/feed` | yes |
| POST | `/articles` | yes |
| GET | `/articles/:slug` | |
| PUT, DELETE | `/articles/:slug` | yes |
| POST, DELETE | `/articles/:slug/favorite` | yes |
| GET | `/profiles/:username` | optional |
| POST, DELETE | `/profiles/:username/follow` | yes |
| GET | `/tags` | |

## How it is built

- **One module per domain:** `user`, `article`, `profile`, `tag`. Each has its controller, service, entity and response types.
- **Authentication:** a middleware reads the JWT from the request and loads the user. A guard protects private routes, and a custom `@User()` decorator gives the controller the current user. Passwords are hashed with bcrypt.
- **Validation:** DTOs with `class-validator` and a custom pipe that returns errors in the format the frontend expects.
- **Database:** PostgreSQL with TypeORM. The schema is built only with migrations (`synchronize` is off), and a seed migration adds test data.

## Run locally

You need Node.js and PostgreSQL. Create a database and user that match `src/ormconfig.ts`, then:

```bash
npm install
npm run db:migrate   # create tables
npm run db:seed      # optional: add test data
npm start            # API on http://localhost:3000
```

## Known limitations

- The database settings and the JWT secret are written in the code for local use. A real deployment should read them from environment variables.
- There are no tests beyond the default ones from Nest CLI.

## Stack

NestJS 9, TypeScript, TypeORM 0.3, PostgreSQL, JWT, bcrypt, class-validator.
