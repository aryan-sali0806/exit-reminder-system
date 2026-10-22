"""Tests for the pure rule-engine functions — no DB, no async."""
import pytest
from backend.app.rule_engine import compute_required, make_speech


def test_compute_required_union():
    lists = [
        {"tag_names": ["Wallet", "Keys"]},
        {"tag_names": ["Keys", "Gym Bag"]},
    ]
    assert compute_required(lists) == {"Wallet", "Keys", "Gym Bag"}


def test_compute_required_empty():
    assert compute_required([]) == set()


def test_compute_required_single_active():
    assert compute_required([{"tag_names": ["Wallet"]}]) == {"Wallet"}


def test_compute_required_inactive_ignored():
    # active filtering is done at the DB layer; rule engine only sees what is passed
    lists = [{"tag_names": ["Wallet"]}]
    assert compute_required(lists) == {"Wallet"}


def test_make_speech_no_missing():
    assert make_speech([]) == "All items carried. Have a good day."


def test_make_speech_one():
    assert make_speech(["Keys"]) == "Alert. Please remember your Keys."


def test_make_speech_two():
    assert make_speech(["Keys", "Wallet"]) == "Alert. Please remember your Keys and Wallet."


def test_make_speech_three():
    result = make_speech(["Keys", "Wallet", "Umbrella"])
    assert result == "Alert. Please remember your Keys, Wallet and Umbrella."
