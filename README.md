
# FiberX DBMS

**FiberX DBMS** is a centralized schema and migration management system for distributed TypeScript applications. It allows multiple projects to share, update, and manage their database schemas and migrations through a single, Git-synced package.

---

## 🚀 Features

- ✅ Create and delete database schemas dynamically.
- ✅ Generate, execute, and undo migration files.
- ✅ Support for MySQL, PostgreSQL, and MongoDB.
- ✅ Git integration to push/pull schema and migration updates.
- ✅ YAML-based environment and migration tracking.
- ✅ Pluggable architecture for data source connectors.
- ✅ Designed for admin systems to control DB structure across services.

---

## 📦 Installation

```bash
npm install fiberx-dbms
````

Or for local development with GitHub:

```bash
npm install git+https://github.com/your-org/fiberx-dbms.git
```

---

## ⚙️ Usage Example

```ts
import FiberXDBMS from "fiberx-dbms";
import DataTypes from "fiberx-dbms/datatypes";

const run = async () => {
  const dbms = new FiberXDBMS();

  await dbms.initializeDBMS("fibase", "your-public-key");

  dbms.createSchema(
    "UserModel",
    "users",
    "mysql_db",
    {
      id: { type: DataTypes.BIGINT(), auto_increment: true, unique: true },
      name: { type: DataTypes.STRING(100), nullable: false },
      created_at: { type: DataTypes.DATE(), default: "CURRENT_TIMESTAMP" },
    },
    "id",
    [],
    1,
    true
  );

  await dbms.generateMigrations();
  await dbms.executeMigrations();
};
```

---

## 🗃 Project Structure

```
fiberx-dbms/
├── api/                     # External API clients
├── app_configs/            # Environment & migration logs (YAML)
├── datasource_connectors/  # MySQL, PostgreSQL, Mongo connectors
├── datatypes/              # Schema datatypes per datasource
├── migrations/             # Versioned migration files
├── models/                 # Base model abstraction
├── query_builders/         # SQL query builders
├── schemas/                # Schema definitions
├── scripts/                # CLI + code generation scripts
├── utils/                  # Git, UUID, Logger, etc.
└── app.ts                  # Entry point for library
```

---

## 🔄 Git Integration

FiberX DBMS automatically commits and pushes schema/migration changes to the remote Git repo, enabling all dependent projects to stay up to date with a simple `git pull`.

Ensure that environments like **Google Cloud Run** have Git installed and access to your remote repository.

---

## 🧱 Supported Databases

* [x] MySQL
* [x] PostgreSQL
* [x] MongoDB

---

## 🧩 Designed For

* Admin portals that need dynamic schema control.
* Microservice projects sharing a common data model.
* CI/CD pipelines needing reliable schema propagation.

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repo
2. Create a feature branch
3. Submit a pull request

Please run tests and linting before submitting.

---

## 📄 License

MIT License. See [LICENSE](./LICENSE) for details.

---

## 🧠 Inspiration

FiberX DBMS was built to solve the challenge of maintaining consistent, centrally managed database schemas in a multi-service environment—especially for fast-moving startups and modular systems.

