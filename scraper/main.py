#!/usr/bin/env python3
"""
X Profile Scraper with Grok AI
Searches for X (Twitter) profiles and uses Grok to intelligently match the correct person
"""

import csv
import json
import os
import re
import sys
import time
from typing import Optional, List, Dict
from enum import Enum
from dotenv import load_dotenv
import requests
from requests_oauthlib import OAuth1
from pydantic import BaseModel, Field
from xai_sdk import Client
from xai_sdk.chat import system, user

# Load environment variables from parent directory
load_dotenv('/Users/advaitpaliwal/Projects/xpert/.env.local')

# Configuration
# OAuth 1.0a credentials for X API
CONSUMER_KEY = os.getenv('X_CONSUMER_KEY')
CONSUMER_SECRET = os.getenv('X_CONSUMER_SECRET')
ACCESS_TOKEN = os.getenv('X_ACCESS_TOKEN')
ACCESS_TOKEN_SECRET = os.getenv('X_ACCESS_TOKEN_SECRET')

# Grok API
XAI_API_KEY = os.getenv('XAI_API_KEY')

X_USERS_SEARCH_ENDPOINT = 'https://api.x.com/2/users/search'
X_USERS_TWEETS_ENDPOINT = 'https://api.x.com/2/users/{}/tweets'
RATE_LIMIT_DELAY = 1  # seconds between requests
MAX_RESULTS_PER_QUERY = 10
MAX_TWEETS_PER_USER = 10
INPUT_FILE = 'names.txt'
OUTPUT_JSON = 'x_profiles_found.json'
OUTPUT_CSV = 'x_profiles_found.csv'


# Pydantic Schema for Grok Structured Output
class MatchConfidence(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"


class MatchResult(BaseModel):
    matched_username: str = Field(description="The username of the best match from the candidates")
    confidence: MatchConfidence = Field(description="Confidence level of the match")
    reasoning: str = Field(description="Brief explanation of why this match was chosen")


def get_oauth_auth():
    """Create OAuth 1.0a authentication"""
    return OAuth1(
        CONSUMER_KEY,
        CONSUMER_SECRET,
        ACCESS_TOKEN,
        ACCESS_TOKEN_SECRET
    )


def clean_search_query(query: str) -> str:
    """Clean query to match X API requirements: ^[A-Za-z0-9_' ]{1,50}$"""
    # Remove parentheses but keep the words inside
    query = re.sub(r'[()]', '', query)
    # Keep only allowed characters
    query = re.sub(r'[^A-Za-z0-9_\' ]', '', query)
    # Remove extra whitespace
    query = ' '.join(query.split())
    # Limit to 50 chars
    return query[:50].strip()


def search_x_users(query: str) -> Optional[List[Dict]]:
    """
    Search for X users matching the query
    Returns list of user results or None if error
    """
    if not all([CONSUMER_KEY, CONSUMER_SECRET, ACCESS_TOKEN, ACCESS_TOKEN_SECRET]):
        print("ERROR: OAuth 1.0a credentials not found in environment variables")
        return None

    # Clean query for X API requirements
    cleaned_query = clean_search_query(query)

    auth = get_oauth_auth()
    params = {
        'query': cleaned_query,
        'max_results': MAX_RESULTS_PER_QUERY,
        'user.fields': 'id,name,username,description,public_metrics,verified,verified_type,created_at'
    }

    try:
        response = requests.get(X_USERS_SEARCH_ENDPOINT, auth=auth, params=params)

        if response.status_code == 200:
            data = response.json()
            return data.get('data', [])
        elif response.status_code == 429:
            print(f"  ⚠️ Rate limit hit, waiting 60 seconds...")
            time.sleep(60)
            return search_x_users(query)  # Retry
        else:
            print(f"  ❌ Error {response.status_code}: {response.text}")
            return None

    except Exception as e:
        print(f"  ❌ Exception during API call: {e}")
        return None


def get_user_tweets(user_id: str) -> Optional[List[Dict]]:
    """
    Fetch recent tweets for a user
    Returns list of tweets or None if error
    """
    auth = get_oauth_auth()
    url = X_USERS_TWEETS_ENDPOINT.format(user_id)
    params = {
        'max_results': MAX_TWEETS_PER_USER,
        'tweet.fields': 'created_at,text,public_metrics'
    }

    try:
        response = requests.get(url, auth=auth, params=params)

        if response.status_code == 200:
            data = response.json()
            return data.get('data', [])
        elif response.status_code == 429:
            print(f"  ⚠️ Rate limit hit for tweets, waiting 60 seconds...")
            time.sleep(60)
            return get_user_tweets(user_id)
        else:
            # User might have no tweets or protected account
            return []

    except Exception as e:
        print(f"  ⚠️ Could not fetch tweets for user {user_id}: {e}")
        return []


def grok_match_user(original_name: str, candidates: List[Dict]) -> Optional[Dict]:
    """
    Use Grok AI to intelligently match the correct user from candidates
    Returns the matched user dict or None
    """
    if not XAI_API_KEY:
        print("ERROR: XAI_API_KEY not found in environment variables")
        return None

    if not candidates:
        return None

    # Build the context for Grok
    context = f"Original search query: {original_name}\n\n"
    context += "Candidate users:\n\n"

    for idx, candidate in enumerate(candidates, 1):
        context += f"Candidate {idx}:\n"
        context += f"  Username: @{candidate.get('username')}\n"
        context += f"  Full Name: {candidate.get('name')}\n"
        context += f"  Bio: {candidate.get('description', 'No bio')}\n"
        context += f"  Verified: {candidate.get('verified', False)}\n"
        context += f"  Followers: {candidate.get('public_metrics', {}).get('followers_count', 0)}\n"

        # Add recent tweets
        tweets = candidate.get('tweets', [])
        if tweets:
            context += f"  Recent tweets:\n"
            for tweet in tweets[:5]:  # Show first 5 tweets
                tweet_text = tweet.get('text', '')[:150]  # Truncate long tweets
                context += f"    - {tweet_text}\n"
        else:
            context += f"  Recent tweets: None available\n"
        context += "\n"

    # Create Grok chat
    try:
        client = Client(api_key=XAI_API_KEY)
        chat = client.chat.create(model="grok-4-1-fast-non-reasoning")

        chat.append(system("""Match the person to their X profile. These people are at an xAI hackathon.

Look for name matches and profiles that suggest they'd attend hackathons (engineers, researchers, builders). Consider xAI/tech mentions in bio and tweets. Always pick the best match from the candidates."""))

        chat.append(user(context))

        # Use structured output
        _, match_result = chat.parse(MatchResult)

        # Strip @ if Grok included it
        matched_username = match_result.matched_username.lstrip('@')

        print(f"  🎯 Grok picked: @{matched_username}")
        print(f"      Confidence: {match_result.confidence}")
        print(f"      Reasoning: {match_result.reasoning}")

        # Find the matched user in candidates
        for candidate in candidates:
            if candidate.get('username') == matched_username:
                return {
                    'user': candidate,
                    'confidence': match_result.confidence,
                    'reasoning': match_result.reasoning
                }

        # If username not found in candidates (shouldn't happen), return None
        print(f"  ⚠️ Username not found in candidates")
        print(f"      Candidates were: {[c.get('username') for c in candidates]}")
        return None

    except Exception as e:
        print(f"  ❌ Grok API error: {e}")
        return None


def save_results_incrementally(results: List[Dict]):
    """Save results to JSON file incrementally"""
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)


def process_names():
    """Main processing loop"""
    print(f"Starting X Profile Scraper with Grok AI...")
    print(f"Reading from: {INPUT_FILE}")
    print(f"Output will be saved to: {OUTPUT_JSON} and {OUTPUT_CSV}")
    print("-" * 60)

    if not all([CONSUMER_KEY, CONSUMER_SECRET, ACCESS_TOKEN, ACCESS_TOKEN_SECRET]):
        print("\n❌ ERROR: Please set OAuth 1.0a credentials in your .env.local file")
        return

    if not XAI_API_KEY:
        print("\n❌ ERROR: Please set XAI_API_KEY in your .env.local file")
        return

    results = []

    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            names = list(reader)

        total = len(names)
        print(f"Found {total} names to process\n")

        for idx, row in enumerate(names, 1):
            name = row.get('Name', '').strip()
            title = row.get('Title', '').strip()

            if not name or name == 'Name':  # Skip header
                continue

            # Extract existing username if present (e.g., "@alish2001_")
            existing_username = None
            if title.startswith('@'):
                existing_username = title.replace('@', '')

            print(f"\n[{idx}/{total}] Processing: {name}")

            if existing_username:
                result = {
                    'original_name': name,
                    'username': existing_username,
                    'profile_url': f'https://x.com/{existing_username}',
                    'confidence': 'existing',
                    'source': 'existing'
                }
                results.append(result)
                print(f"  ✓ Found existing username: @{existing_username}")
                print(f"  {json.dumps(result, indent=4)}")

                # Save incrementally
                save_results_incrementally(results)
                continue

            # Step 1: Search X API for candidates
            cleaned_name = clean_search_query(name)
            print(f"  🔍 Searching X API for: {name}")
            if cleaned_name != name:
                print(f"      (cleaned to: {cleaned_name})")
            search_results = search_x_users(name)

            if not search_results:
                print(f"  ❌ No search results found")
                result = {
                    'original_name': name,
                    'username': 'NOT_FOUND',
                    'profile_url': '',
                    'confidence': 'none',
                    'source': 'error'
                }
                results.append(result)
                save_results_incrementally(results)
                time.sleep(RATE_LIMIT_DELAY)
                continue

            print(f"  📋 Found {len(search_results)} candidates:")
            for i, candidate in enumerate(search_results, 1):
                print(f"      {i}. @{candidate.get('username')} - {candidate.get('name')}")

            print(f"  📝 Fetching recent tweets for each candidate...")

            # Step 2: Fetch tweets for each candidate
            for candidate in search_results:
                user_id = candidate.get('id')
                tweets = get_user_tweets(user_id)
                candidate['tweets'] = tweets if tweets else []
                time.sleep(0.5)  # Small delay between tweet fetches

            # Step 3: Use Grok to intelligently match
            print(f"  🤖 Using Grok AI to find best match...")
            best_match = grok_match_user(name, search_results)

            if best_match:
                user = best_match['user']
                username = user.get('username')

                result = {
                    'original_name': name,
                    'username': username,
                    'full_name': user.get('name'),
                    'profile_url': f'https://x.com/{username}',
                    'verified': user.get('verified', False),
                    'followers': user.get('public_metrics', {}).get('followers_count', 0),
                    'confidence': best_match['confidence'],
                    'reasoning': best_match['reasoning'],
                    'source': 'grok_match'
                }
                results.append(result)

                print(f"  ✓ Matched: @{username} (confidence: {best_match['confidence']})")
                print(f"  💭 {best_match['reasoning']}")
                print(f"  {json.dumps(result, indent=4)}")
            else:
                print(f"  ❌ No confident match found")
                result = {
                    'original_name': name,
                    'username': 'NOT_FOUND',
                    'profile_url': '',
                    'confidence': 'none',
                    'source': 'no_match'
                }
                results.append(result)

            # Save incrementally after each result
            save_results_incrementally(results)

            # Rate limiting
            time.sleep(RATE_LIMIT_DELAY)

        # Write final results to CSV
        print("\n" + "-" * 60)
        print(f"Writing results to {OUTPUT_CSV}...")

        with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['original_name', 'username', 'full_name',
                         'profile_url', 'verified', 'followers', 'confidence', 'reasoning', 'source']
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(results)

        # Summary
        found = sum(1 for r in results if r['username'] not in ['NOT_FOUND', 'ERROR'])
        not_found = sum(1 for r in results if r['username'] == 'NOT_FOUND')

        print(f"\n✅ Summary:")
        print(f"  Total processed: {len(results)}")
        print(f"  Found: {found}")
        print(f"  Not found: {not_found}")
        print(f"\n📁 Results saved to:")
        print(f"  - {OUTPUT_JSON}")
        print(f"  - {OUTPUT_CSV}")

    except FileNotFoundError:
        print(f"❌ ERROR: Could not find {INPUT_FILE}")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    process_names()
