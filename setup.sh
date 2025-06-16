#!/bin/bash
bun install
cd shared/prisma
bun prisma migrate dev --name init
bun prisma generate