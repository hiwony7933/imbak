from flask import Flask, render_template, request, redirect, url_for, jsonify # redirect와 url_for 추가
import requests
import json
from datetime import datetime, timedelta # timedelta 추가
import sys
import flask

app = Flask(__name__)

def format_currency(value):
    try:
        return f"{int(value):,}"
    except (ValueError, TypeError):
        return value

def get_join_type_text(join_type):
    join_type_map = {
        "1": "무관",
        "2": "커플",
        "3": "남성",
        "4": "여성"
    }
    return join_type_map.get(str(join_type), "무관")

# 골프장 정보 목록 (실제로는 API나 DB에서 가져올 수 있음)
GOLF_COURSES = [
    {"id": "1", "name": "경기도"},
    {"id": "2", "name": "강원도"},
    {"id": "3", "name": "충청도"},
    {"id": "4", "name": "경상도"},
    {"id": "5", "name": "전라도"},
    {"id": "6", "name": "제주도"}
]

# 날짜 형식 변환 함수 추가
def format_datetime(datetime_str):
    """날짜/시간 문자열을 'MM/DD HH:MM' 형식으로 변환"""
    try:
        # 입력 형식이 'YYYY-MM-DD HH:MM:SS'라고 가정
        parts = datetime_str.split(' ')
        if len(parts) != 2:
            return datetime_str  # 형식이 맞지 않으면 원본 반환
        
        date_part = parts[0]
        time_part = parts[1]
        
        # 날짜 부분에서 월/일만 추출 (YYYY-MM-DD -> MM/DD)
        date_parts = date_part.split('-')
        if len(date_parts) == 3:
            month = date_parts[1]
            day = date_parts[2]
            date_part = f"{month}/{day}"
        
        # 시간 부분에서 초를 제거 (HH:MM:SS -> HH:MM)
        time_parts = time_part.split(':')
        if len(time_parts) >= 2:
            time_part = f"{time_parts[0]}:{time_parts[1]}"
        
        return f"{date_part} {time_part}"
    except Exception:
        return datetime_str  # 오류 발생 시 원본 반환

# 기본 페이지는 폼으로 리디렉션
@app.route('/')
def index():
    return redirect(url_for('home'))

# URL에 날짜를 포함하거나, 쿼리 파라미터로 받거나, 기본값으로 오늘 날짜 사용
@app.route('/golf')
def home():
    # 쿼리 파라미터에서 날짜와 골프장 ID 가져오기
    target_date_str = request.args.get('date')
    location_id = request.args.get('location_id', '1')  # 기본값은 '1' (경기도)
    
    # 요청 출처 확인 (검색 버튼, 필터 변경 등)
    source = request.args.get('source')

    # 선택된 골프장 목록 가져오기 (체크박스)
    selected_golf_venues = request.args.getlist('golf_venues')
    
    # 날짜 처리
    today = datetime.now().date()
    today_str = today.strftime('%Y-%m-%d')
    
    if target_date_str:
        try:
            # URL에서 받은 날짜 문자열을 datetime 객체로 변환
            target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
            # 과거 날짜인지 확인
            if target_date < today:
                current_date = today_str # 과거 날짜면 오늘로
            else:
                current_date = target_date_str # 유효한 날짜
        except ValueError:
            # 잘못된 형식의 날짜면 오늘 날짜로 대체
            current_date = today_str
    else:
        # URL에 날짜가 없으면 오늘 날짜 사용
        current_date = today_str

    # API 요청 정보
    url = "https://golfmon.net/action_front.php"
    headers = {
        'accept': '*/*',
        'accept-language': 'ko,ko-KR;q=0.9,en-US;q=0.8,en;q=0.7',
        'content-type': 'application/x-www-form-urlencoded',
        'origin': 'https://m.golfmon.net',
        'referer': 'https://m.golfmon.net/',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    }
    payload = {
        'cmd': 'ApiTransferJoin.getListOfTransferJoin_Location',
        'transferJoinTypeID': '2',
        'location_fk': location_id,  # 선택한 골프장 지역 ID
        'manager_fk': '0',
        'dates': current_date,  # 동적으로 설정된 날짜 사용
        'bookingPlazaTimeFilter': '',
        'bookingPlazaOrderFilter': ''
    }

    items_to_display = []
    # ... (이하 API 요청 및 데이터 처리 로직은 이전과 유사하게 진행) ...
    try:
        response = requests.post(url, headers=headers, data=payload)
        response.raise_for_status()
        returned_data = response.json()
        raw_items = returned_data.get('entity', [])
        
        # API 응답 디버깅 로그
        app.logger.info(f"API 응답 상태 코드: {response.status_code}")
        app.logger.info(f"API 응답 데이터 크기: {len(raw_items)}개 항목")
        
        # 모든 골프장 정보를 저장할 리스트 (체크박스 필터링을 위해)
        all_golf_venues = set()
        filtered_items = []
        
        for item in raw_items:
            # 디버깅: 일부 항목의 구조 확인
            # if len(all_golf_venues) < 2:
            #     app.logger.debug(f"항목 예시: {item.get('name', '이름 없음')}")
                
            if 'greenFee' in item:
                item['greenFee_formatted'] = format_currency(item['greenFee'])
                # 정수형 그린피 변환 (정렬을 위해)
                try:
                    item['greenFee_int'] = int(item['greenFee'])
                except (ValueError, TypeError):
                    item['greenFee_int'] = 0
            else:
                item['greenFee_int'] = 0
                
            # 날짜/시간 형식 변환
            if 'dates' in item and item['dates']:
                item['dates'] = format_datetime(item['dates'])
            
            # joinTypeStr 처리 (인원 유형 설정)
            if 'joinTypeStr' in item:
                item['join_type_text'] = get_join_type_text(item['joinTypeStr'])
            else:
                item['join_type_text'] = "무관"
            
            # 골프장 이름을 저장 (체크박스 옵션용)
            if 'name' in item and item['name']:
                all_golf_venues.add(item['name'])
            
            # 'source'가 'search'일 때만 필터링
            if source == 'search':
                if not selected_golf_venues or item.get('name') in selected_golf_venues:
                    filtered_items.append(item)
            else:
                # 'search'가 아니면 (지역/날짜 변경 등) 결과 목록을 보여주지 않음
                # 단, 골프장 목록(all_golf_venues)은 필요하므로 루프는 계속
                pass
        
        # 디버깅 로그 추가
        # app.logger.info(f"골프장 개수: {len(all_golf_venues)}")
        # app.logger.info(f"골프장 목록: {sorted(all_golf_venues) if len(all_golf_venues) < 10 else '너무 많아서 생략'}")
        
        # 'source'가 'search'일 경우에만 정렬 및 최저가 계산 수행
        if source == 'search':
            # 정렬 적용: '티업 시간 빠른 순'으로 고정
            filtered_items.sort(key=lambda x: x.get('dates', '').split(' ')[-1] if x.get('dates') else '')
            
            # 골프장별 최저가 계산
            lowest_prices = {}
            for item in filtered_items:
                golf_name = item.get('name')
                green_fee = item.get('greenFee_int', 0)
                
                if golf_name and green_fee > 0:
                    if golf_name not in lowest_prices or green_fee < lowest_prices[golf_name]:
                        lowest_prices[golf_name] = green_fee
            
            # 최저가 플래그 추가
            for item in filtered_items:
                golf_name = item.get('name')
                green_fee = item.get('greenFee_int', 0)
                if golf_name and green_fee > 0 and green_fee == lowest_prices.get(golf_name):
                    item['is_lowest_price'] = True
                else:
                    item['is_lowest_price'] = False
            
            items_to_display = filtered_items
        else:
            # 'search'가 아니면, 결과 목록은 비우고 선택된 골프장도 초기화
            items_to_display = []
            selected_golf_venues = []
        
        if not items_to_display and source == 'search':
            # ... (entityTop 확인 로직 등) ...
            pass

    except requests.exceptions.RequestException as e:
        app.logger.error(f"API 요청 오류: {str(e)}")
        all_golf_venues = []
        filtered_items = []
    except Exception as e:
        app.logger.error(f"데이터 처리 오류: {str(e)}")
        all_golf_venues = []
        filtered_items = []
    # 템플릿에 현재 보고 있는 날짜와 골프장 리스트, 선택된 골프장 ID 등을 전달
    return render_template('index.html', 
                           banners=items_to_display, 
                           display_date=current_date, 
                           golf_courses=GOLF_COURSES, 
                           selected_location_id=location_id,
                           all_golf_venues=sorted(all_golf_venues) if 'all_golf_venues' in locals() and all_golf_venues else ["데이터 로딩 중..."],
                           selected_golf_venues=selected_golf_venues,
                           today_date=today_str)

@app.route('/analyzer')
def analyzer():
    """API 분석기 페이지를 렌더링합니다."""
    return render_template('analyzer.html', golf_courses=GOLF_COURSES)

@app.route('/api/golfmon', methods=['POST'])
def golfmon_proxy():
    """Golfmon API에 대한 프록시 역할을 합니다."""
    # 클라이언트로부터 전달받은 파라미터
    data = request.get_json()
    
    # API 요청 정보
    url = "https://golfmon.net/action_front.php"
    headers = {
        'accept': '*/*',
        'accept-language': 'ko,ko-KR;q=0.9,en-US;q=0.8,en;q=0.7',
        'content-type': 'application/x-www-form-urlencoded',
        'origin': 'https://m.golfmon.net',
        'referer': 'https://m.golfmon.net/',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    }
    
    # 클라이언트에서 받은 파라미터를 페이로드로 구성
    # 예: { "location_id": "1", "dates": "2024-05-24" }
    payload = {
        'cmd': 'ApiTransferJoin.getListOfTransferJoin_Location',
        'transferJoinTypeID': '2',
        'location_fk': data.get('location_id', '1'),
        'manager_fk': '0',
        'dates': data.get('dates', datetime.now().strftime('%Y-%m-%d')),
        'bookingPlazaTimeFilter': '',
        'bookingPlazaOrderFilter': ''
    }

    try:
        response = requests.post(url, headers=headers, data=payload)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}, 500

# 디버깅 엔드포인트 추가
@app.route('/debug')
def debug():
    # 현재 날짜 설정
    today = datetime.now()
    current_date = today.strftime('%Y-%m-%d')
    
    # API 요청 준비
    url = "https://m.golfmon.net/api/v2/transfer/join/list"
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0'
    }
    
    # 기본 지역 ID (경기도)
    location_id = "1"
    
    # 요청 파라미터 설정
    payload = {
        'location_id': location_id,
        'date': current_date,
        'page': 1,
        'limit': 100
    }
    
    try:
        response = requests.post(url, headers=headers, data=payload)
        response.raise_for_status()
        returned_data = response.json()
        raw_items = returned_data.get('entity', [])
        
        # 골프장 이름 추출
        golf_venues = set()
        for item in raw_items:
            if 'name' in item and item['name']:
                golf_venues.add(item['name'])
        
        # 디버깅 정보 반환
        debug_info = {
            'status': 'success',
            'api_response_code': response.status_code,
            'items_count': len(raw_items),
            'golf_venues_count': len(golf_venues),
            'golf_venues': sorted(golf_venues) if len(golf_venues) < 20 else '너무 많아서 생략',
            'server_env': {
                'python_version': sys.version,
                'flask_version': flask.__version__,
                'host': request.host,
                'user_agent': request.headers.get('User-Agent', '정보 없음')
            }
        }
        
        return jsonify(debug_info)
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    new_port = 5001
    app.run(debug=True, host='0.0.0.0', port=new_port)