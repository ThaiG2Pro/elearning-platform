@startuml
skinparam componentStyle uml2
skinparam packageStyle frame
skinparam backgroundColor #FFFFFF

title System Architecture Diagram - E-Learning Platform

actor "User Browser" as Browser

node "Client Side (Next.js - Frontend)" #F8F9FA {
    component [React Components] as React
    component [Next.js Client Runtime] as ClientRuntime
}

node "Server Side (Next.js - Backend)" #E7F5FF {
    component [API Routes Handler] as API
    component [Prisma ORM Client] as Prisma
}

node "External Cloud Services" #FFF9DB {
    component "YouTube API" as YT
    component "SMTP Service (AWS SES/SendGrid)" as Mail
}

database "Data Store" #F4FCE3 {
    database "PostgreSQL" as DB
}

'--- Interactions & Protocols ---
Browser <--> API : HTTPS (JSON/REST)
Browser <..> React : Render/Hydrate

API <--> Prisma : Internal Call
Prisma <--> DB : TCP/IP (SQL Port 5432)

API --> YT : HTTPS / OAuth2
API --> Mail : SMTP / API Key

'--- Security ---
note right of Browser : JWT stored in \nhttpOnly Cookie
@enduml
