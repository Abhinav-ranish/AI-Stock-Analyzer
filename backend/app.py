from flask import Flask
from flask_cors import CORS

from blueprints.prompt       import prompt_bp
from blueprints.fundamentals import fund_bp
from blueprints.insider      import ins_bp
from blueprints.technical    import tech_bp
from blueprints.sentiment    import news_bp
from blueprints.analysis     import an_bp
from blueprints.portfolio import portfolio_bp
from blueprints.auth import auth_bp

from dotenv import load_dotenv
load_dotenv()  # this loads .env vars into os.environ

app = Flask(__name__)
CORS(app, supports_credentials=True)
for bp in (prompt_bp, fund_bp, ins_bp, tech_bp, news_bp, an_bp, portfolio_bp, auth_bp):
    app.register_blueprint(bp)

if __name__=='__main__':
    app.run(debug=True, port=10000, host="0.0.0.0")
