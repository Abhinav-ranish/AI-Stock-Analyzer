# blueprints/prompt.py

from flask import Blueprint, render_template, request, redirect, url_for

prompt_bp = Blueprint(
    'prompt',
    __name__,
    url_prefix='/prompt',
    template_folder='templates'
)



@prompt_bp.route('/', methods=['GET'])
def show_prompt_form():
    """
    Render a simple HTML form to collect:
      - ticker symbol
      - term (short or long)
      - penny‑stock flag
      - age
      - risk profile
    """
    return render_template('prompt.html')


@prompt_bp.route('/', methods=['POST'])
def handle_prompt():
    """
    Read the submitted form data and redirect to /analysis
    (you can also store these in session or pass as query params).
    """
    ticker     = request.form.get('ticker', '').upper()
    term       = request.form.get('term', 'long')       # 'short' or 'long'
    penny_flag = request.form.get('penny', 'off') == 'on'
    age        = request.form.get('age', '')
    risk       = request.form.get('risk', '')

    return redirect(
        url_for(
            'analysis.analyze',
            ticker=ticker,
            term=term,
            penny=penny_flag,
            age=age,
            risk_profile=risk
        )
    )
