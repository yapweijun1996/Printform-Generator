import React from 'react';
import { render, screen } from '@testing-library/react';
import MessageBubble from './MessageBubble';
import { Sender, type Message } from '../../types';

describe('MessageBubble', () => {
  it('renders bot message text', () => {
    const message: Message = {
      id: 'm1',
      sender: Sender.Bot,
      text: 'Hello world',
      timestamp: Date.now(),
    };
    render(<MessageBubble message={message} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });
});
