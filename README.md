# Dynastic Place Archival Tool

A tool for creating a read-only archive of a site formerly using [Dynastic's Place project](https://github.com/dynastic/place) that can be statically hosted.

It writes the base website files like the homepage and resources (CSS, JS), then writes a profile page for each user, a PNG image of the board, and a JSON file for each pixel (for pixel info). Other data like chats is not migrated - but this script does not modify the database at all. The client side code has been stripped down to remove the ability to paint and WebSockets. Because of this, if you have made changes to your Place instance such as to the Pug layouts or client scripts, they will not be used, though you can diff your instance against [the original Place](https://github.com/dynastic/place) and then apply any applicable changes by hand if necessary.

## Why?

If you've run an instance of Place, you know it takes a bit of attention to setup and continue hosting, from (aging) dependencies to maintaining a WebSocket server and database. If you've decided its time to make your site read-only but want to maintain an archive for your users, you still need to keep all that running even if not a live site anymore needing the full functionality. This repo allows you to convert a live instance of Place to a static set of HTML and a few other types of files, so that it can be thrown up on any low-powered server easily. 

## Prerequisites

* Node 16 or **higher**
* [MongoDB](https://www.mongodb.com)
* An existing [Place](https://github.com/dynastic/place) instance, including its source and database
* A lot of RAM (for generation), depending on the size of your instance (you will have data on every user in memory for speed).

## Getting started

These instructions will help you convert an existing instance of [Dynastic Place](https://github.com/dynastic/place) to a set of HTML and JSON files that can be statically hosted.

1. Clone this repository to any directory
1. Run `npm i` to install dependencies
1. Run `npm run generate <path to old place instance config folder>` with the path of your old Place instance's config folder (`<repository root>/config`) on disk. Make sure the database is accessible from this machine at the URL in the `config.js` file.  
*Tip:* You can override the database using the `DATABASE` environment variable in case its different from the environment Place used to run in.  
*Another tip:* If you really need to, you can increase the maximum heap size available to Node with `--max-old-space-size=<bytes>`
1. Upload the generated files somewhere nice.

## License

Dynastic Place Archival Tool is licensed under a [modified version of the APGL-3.0 license](https://github.com/dynastic/place-archive/blob/master/LICENSE). Please see it for details.
