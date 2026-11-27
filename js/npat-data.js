/* Built-in word lists for Name, Place, Animal, Thing. Used by the AI and to check answers.
   Anything not listed here is shown as "unchecked" and the players decide whether it counts. */
(function () {
  'use strict';
  window.NPAT_DATA = {
    letters: 'ABCDEFGHIJKLMNOPRSTW',
    cats: {
      name: {
        A: 'Aarav Aditya Amit Anita Arjun Asha Aman Anjali', B: 'Bharat Bhavna Bina Bobby Brian Bella Binod Bhanu',
        C: 'Chetan Chirag Charlie Chhaya Carol Chandni Clara Colin', D: 'Deepak Divya Dev Disha Daniel Diana Dinesh David',
        E: 'Esha Eshan Emma Eva Ethan Elina Eric Ela', F: 'Farhan Fatima Faiz Freya Frank Falguni Fiona Firoz',
        G: 'Gaurav Geeta Gopal Gauri George Grace Gita Girish', H: 'Harsh Hina Hari Heena Henry Hannah Hemant Harini',
        I: 'Isha Imran Indra Ishaan Irfan Ira Ishita Ivan', J: 'Jay Jaya Jatin John Julia Jiya Jack Jyoti',
        K: 'Karan Kavya Kiran Krish Kabir Kunal Kavita Kajal', L: 'Lata Lakshmi Laksh Leela Liam Lucy Lalit Lisa',
        M: 'Mohan Meera Manish Mansi Mahesh Maya Mohit Mary', N: 'Neha Naveen Nisha Nikhil Naina Nitin Nora Noah',
        O: 'Om Omkar Ojas Olivia Oliver Oscar Ojasvi Omar', P: 'Priya Pooja Prakash Palak Parth Piyush Pranav Paul',
        R: 'Rahul Riya Rohan Ritu Raj Ria Ravi Rekha', S: 'Sachin Sneha Suresh Sita Sam Sara Sanjay Shivam',
        T: 'Tara Tanvi Tushar Tina Tejas Trisha Tanya Tanmay', W: 'Wasim Wendy William Waqar Walter Winnie Wanda Wilson'
      },
      place: {
        A: 'Agra Assam Australia Amritsar Ahmedabad Athens Argentina Africa', B: 'Bengaluru Bhopal Brazil Bihar Berlin Bangkok Beijing Bhubaneswar',
        C: 'Chennai Chandigarh China Canada Cairo Colombo Cuba Chicago', D: 'Delhi Dubai Denmark Dehradun Dhaka Darjeeling Dallas Dublin',
        E: 'Egypt England Ernakulam Edinburgh Ethiopia Ecuador Erode Estonia', F: 'France Finland Faridabad Florida Fiji Frankfurt Faizabad Florence',
        G: 'Goa Gujarat Gwalior Germany Greece Guwahati Ghana Geneva', H: 'Hyderabad Haryana Haridwar Himachal Havana Hanoi Holland Hawaii',
        I: 'India Indore Italy Iran Iraq Ireland Itanagar Istanbul', J: 'Jaipur Jodhpur Japan Jamshedpur Jammu Jordan Jalandhar Jamaica',
        K: 'Kolkata Kerala Kanpur Kashmir Kenya Kochi Kanyakumari Kathmandu', L: 'Lucknow London Ladakh Ludhiana Lahore Lisbon Libya Lebanon',
        M: 'Mumbai Mysore Madurai Manipur Mexico Moscow Malaysia Madrid', N: 'Nagpur Nashik Nepal Nagaland Norway Nairobi Nigeria Noida',
        O: 'Odisha Ooty Oman Oslo Ottawa Osaka Orissa Ongole', P: 'Patna Pune Punjab Paris Pakistan Peru Panaji Portugal',
        R: 'Rajasthan Ranchi Rome Russia Rajkot Romania Rishikesh Rwanda', S: 'Surat Shimla Sikkim Singapore Spain Sydney Srinagar Sweden',
        T: 'Thane Tokyo Tamil_Nadu Telangana Thailand Turkey Trivandrum Tripura', W: 'Warsaw Washington Wayanad Wardha Wales Wellington Wyoming Windsor'
      },
      animal: {
        A: 'Ant Ape Alligator Antelope Armadillo Anaconda Albatross Ass', B: 'Bear Bat Buffalo Bull Butterfly Bee Bison Beaver',
        C: 'Cat Cow Camel Cobra Crow Cheetah Crocodile Chimpanzee', D: 'Dog Deer Donkey Dolphin Duck Dove Dragonfly Dingo',
        E: 'Elephant Eagle Emu Eel Elk Earthworm Egret Ermine', F: 'Fox Frog Fish Flamingo Falcon Fly Firefly Ferret',
        G: 'Goat Giraffe Gorilla Goose Gecko Grasshopper Gazelle Gibbon', H: 'Horse Hen Hippo Hawk Hamster Hyena Hedgehog Heron',
        I: 'Iguana Ibis Ibex Impala Insect Isopod', J: 'Jaguar Jackal Jellyfish Jackrabbit Jay Jerboa',
        K: 'Kangaroo Koala Kite Kingfisher Kiwi Krill Kudu Komodo', L: 'Lion Leopard Lizard Llama Lobster Ladybug Lynx Lemur',
        M: 'Monkey Mouse Mongoose Moose Mule Magpie Mosquito Meerkat', N: 'Newt Nightingale Narwhal Nilgai Nighthawk Numbat Nutria Nuthatch',
        O: 'Owl Ox Ostrich Otter Octopus Orangutan Oyster Okapi', P: 'Parrot Peacock Pig Panda Penguin Python Pigeon Panther',
        R: 'Rabbit Rat Rhino Raccoon Reindeer Robin Rooster Ram', S: 'Snake Sheep Squirrel Shark Swan Sparrow Seal Spider',
        T: 'Tiger Turtle Tortoise Toad Turkey Termite Tapir Tuna', W: 'Wolf Whale Walrus Wombat Woodpecker Weasel Worm Warthog'
      },
      thing: {
        A: 'Apple Almirah Axe Alarm Anchor Arrow Album Abacus', B: 'Book Bag Bottle Bench Bucket Ball Blackboard Basket',
        C: 'Chair Clock Chalk Cup Computer Camera Comb Cap', D: 'Desk Duster Door Diary Drum Doll Dice Diamond',
        E: 'Eraser Envelope Earphones Egg Engine Elastic Easel Eyeglass', F: 'Fan Flag Fork Flute Fridge Flower Folder Football',
        G: 'Glue Glass Globe Guitar Gate Gloves Gift Grater', H: 'Hat Hammer Handbag Helmet Headphones Hanger Hose Hourglass',
        I: 'Ink Iron Ice Igloo Instrument Inkpot Icecream Idol', J: 'Jar Jug Jacket Jeans Jeep Jewel Juice Jigsaw',
        K: 'Key Kite Kettle Knife Keyboard Kaleidoscope Kitchen Kerosene', L: 'Lamp Locker Lock Ladder Laptop Lantern Ladle Leaf',
        M: 'Mirror Marker Mat Mobile Mug Magnet Microscope Mop', N: 'Notebook Needle Necklace Net Napkin Nail Newspaper Nib',
        O: 'Oven Orange Oil Onion Organ Ointment Oar Opener', P: 'Pen Pencil Paper Plate Pillow Phone Pot Paint',
        R: 'Ruler Rubber Radio Rope Ring Robot Remote Rug', S: 'Scale Scissors Sharpener Slate Spoon Sofa Shoes Stapler',
        T: 'Table Tape Teapot Torch Towel Tray Television Toy', W: 'Watch Wallet Window Whistle Wheel Wire Wall Whiteboard'
      }
    },
    /* Made-up characters: they count as Names only when "fictional names" is switched on. */
    fiction: 'Aladdin Batman Bheem Cinderella Chhota_Bheem Doraemon Dumbledore Elsa Frodo Gandalf Goku Hermione Hulk Joker Jasmine Krrish Kratos Luffy Loki Mario Mickey Minnie Naruto Nobita Olaf Optimus Pikachu Popeye Rapunzel Shinchan Simba Superman Spiderman Shrek Thor Tarzan Tweety Woody Wolverine Wonderwoman'
  };
})();
