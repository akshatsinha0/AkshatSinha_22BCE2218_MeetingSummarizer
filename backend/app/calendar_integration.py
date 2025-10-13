"""
Calendar integration for Google Calendar
Fetches meeting metadata and links action items
"""

import os
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import pickle

SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']
TOKEN_PATH = 'token.pickle'
CREDENTIALS_PATH = 'credentials.json'


class CalendarIntegration:
    def __init__(self):
        self.service = None
        self.creds = None
    
    def authenticate(self):
        """Authenticate with Google Calendar API"""
        if os.path.exists(TOKEN_PATH):
            with open(TOKEN_PATH, 'rb') as token:
                self.creds = pickle.load(token)
        
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                self.creds.refresh(Request())
            else:
                if not os.path.exists(CREDENTIALS_PATH):
                    raise FileNotFoundError(
                        f"Google Calendar credentials not found at {CREDENTIALS_PATH}. "
                        "Download from Google Cloud Console."
                    )
                flow = InstalledAppFlow.from_client_secrets_file(
                    CREDENTIALS_PATH, SCOPES)
                self.creds = flow.run_local_server(port=0)
            
            with open(TOKEN_PATH, 'wb') as token:
                pickle.dump(self.creds, token)
        
        self.service = build('calendar', 'v3', credentials=self.creds)
    
    def get_upcoming_meetings(self, max_results: int = 10) -> List[Dict]:
        """Get upcoming calendar events"""
        if not self.service:
            self.authenticate()
        
        now = datetime.utcnow().isoformat() + 'Z'
        
        events_result = self.service.events().list(
            calendarId='primary',
            timeMin=now,
            maxResults=max_results,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        
        meetings = []
        for event in events:
            meeting = {
                'id': event['id'],
                'title': event.get('summary', 'No title'),
                'start': event['start'].get('dateTime', event['start'].get('date')),
                'end': event['end'].get('dateTime', event['end'].get('date')),
                'attendees': [
                    {'email': a.get('email'), 'name': a.get('displayName', a.get('email'))}
                    for a in event.get('attendees', [])
                ],
                'description': event.get('description', ''),
                'location': event.get('location', ''),
                'hangout_link': event.get('hangoutLink', ''),
                'meet_link': event.get('conferenceData', {}).get('entryPoints', [{}])[0].get('uri', '')
            }
            meetings.append(meeting)
        
        return meetings
    
    def get_meeting_by_id(self, event_id: str) -> Optional[Dict]:
        """Get specific meeting details"""
        if not self.service:
            self.authenticate()
        
        try:
            event = self.service.events().get(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            return {
                'id': event['id'],
                'title': event.get('summary', 'No title'),
                'start': event['start'].get('dateTime', event['start'].get('date')),
                'end': event['end'].get('dateTime', event['end'].get('date')),
                'attendees': [
                    {'email': a.get('email'), 'name': a.get('displayName', a.get('email'))}
                    for a in event.get('attendees', [])
                ],
                'description': event.get('description', ''),
                'location': event.get('location', ''),
            }
        except Exception as e:
            print(f"Error fetching meeting: {e}")
            return None
    
    def search_meetings_by_title(self, query: str, max_results: int = 10) -> List[Dict]:
        """Search for meetings by title"""
        if not self.service:
            self.authenticate()
        
        now = (datetime.utcnow() - timedelta(days=30)).isoformat() + 'Z'
        
        events_result = self.service.events().list(
            calendarId='primary',
            timeMin=now,
            maxResults=max_results,
            q=query,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        
        meetings = []
        for event in events:
            meeting = {
                'id': event['id'],
                'title': event.get('summary', 'No title'),
                'start': event['start'].get('dateTime', event['start'].get('date')),
                'attendees': [a.get('email') for a in event.get('attendees', [])]
            }
            meetings.append(meeting)
        
        return meetings
    
    def create_follow_up_event(
        self,
        title: str,
        start_time: datetime,
        duration_minutes: int,
        attendees: List[str],
        description: str = ""
    ) -> str:
        """Create a follow-up meeting"""
        if not self.service:
            self.authenticate()
        
        end_time = start_time + timedelta(minutes=duration_minutes)
        
        event = {
            'summary': title,
            'description': description,
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': end_time.isoformat(),
                'timeZone': 'UTC',
            },
            'attendees': [{'email': email} for email in attendees],
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'email', 'minutes': 24 * 60},
                    {'method': 'popup', 'minutes': 10},
                ],
            },
        }
        
        event = self.service.events().insert(calendarId='primary', body=event).execute()
        return event.get('id')


def get_calendar_service():
    """Get calendar integration instance"""
    return CalendarIntegration()
