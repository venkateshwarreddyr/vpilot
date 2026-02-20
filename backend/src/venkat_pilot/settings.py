from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # LLM Keys (user-supplied per request, but backend can have defaults)
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    xai_api_key: str = ""

    # Azure Cosmos DB
    cosmos_endpoint: str = ""
    cosmos_key: str = ""
    cosmos_database: str = "venkat_pilot"

    # Azure Blob Storage
    blob_connection_string: str = "UseDevelopmentStorage=true"
    blob_container: str = "screenshots"

    # Auth
    venkat_pilot_api_key: str = "dev-key"
    allowed_origins: str = "http://localhost:5173,chrome-extension://*"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
